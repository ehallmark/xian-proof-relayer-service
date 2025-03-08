

const fs = require('fs')
const assert = require('assert')
const { bigInt } = require('snarkjs')
const circomlib = require('circomlib')
const merkleTree = require('fixed-merkle-tree')
const buildBn128 = require('wasmsnark').buildBn128;
const { saveEventsToDB, loadEventsFromDB } = require('./mongo')
const config = require('./config')


let circuit = null, proving_key, groth16
const MERKLE_TREE_HEIGHT = 20


function convertRHex(r) {
    let b = Buffer.from(r, 'hex')
    r = bigInt.leBuff2int(b)
    return bigInt.leBuff2int(Buffer.from(r.toString(16), 'hex'))
}


/* TEST
async function getTestEvents() {
    const r1Hex = '2cd21c385f8aaf9956050450264a6438c1a49d8b72c4ca1c18106ffadb80e8'
    const r2Hex = '3af8c27645be9358a837f5c53b776bb231d062f477a474f57f3cfc31e0d88a'
    const r3Hex = '3af8c271423e93586837f5c53b776bb231d062f477a474f57f3cfc24e8d776'
    const r1 = convertRHex(r1Hex)
    const r2 = convertRHex(r2Hex)
    const r3 = convertRHex(r3Hex)
    const deposit = createDeposit(r1, r2);
    const events = [{leafIndex: 0, commitmentHex: toHex(deposit.commitment)}]  
    await saveEventsToDB('con_lamnado_phi_1000_v1', events)
    return events;
}
/* END TEST */


async function setup() {
    circuit = require(__dirname + '/../circuits/withdraw.json')
    proving_key = fs.readFileSync(__dirname + '/../circuits/withdraw_proving_key.bin').buffer
    groth16 = await buildBn128()
}


async function getProofForNote(note, recipient, fee, contractName) {
    const deposit = parseNote(note)
    const events = await loadEvents(contractName) //getTestEvents()
    const proofData = await generateSnarkProof(deposit, recipient, fee, events)
    return proofData;
}

function computePedersenHash(hex) {
    const data = Buffer.from(hex, 'hex')
    return toHex(pedersenHash(data))
}


async function loadEvents(contractName) {
    const events = await loadEventsFromDB(contractName)
    const leafIndices = new Set(events.map((event)=>event.leafIndex))
    let index = await readStateFromContract(contractName, 'next_index', [], 0)
    const eventsToSave = []
    for (let i = 1; i <= index; i++) {
        if (!leafIndices.has(i)) {
            let event = await readStateFromContract(contractName, 'commitment_history', [i.toString()], null)
            if (event !== null) {
                let e = {
                    commitmentHex: toHex(event),
                    leafIndex: i,
                }
                events.push(e)
                eventsToSave.push(e)
            }
        }
    }
    if (eventsToSave.length > 0) {
        await saveEventsToDB(contractName, eventsToSave)
    }
    return events
}


async function readStateFromContract(contract, variableName, keys, default_value) {
    try {
        let url = `${config.apiLink}/current/one/${contract}/${variableName}`
        if (keys.length > 0) {
            `${url}/${keys.join(':')}`
        }
        const res = await fetch({
                url: url,
                method: 'GET',
            },
        )
        if (res.status === 200) {
            let json = await res.json()
            let value = json.value
            if (value) {
                if (value.__fixed__) return bigInt(value.__fixed__)
                else return value
            } else {
                return default_value
            }
        } else {
            return default_value
        }
    } catch (error) {
        return default_value;
    }
}

/** Compute pedersen hash */
const pedersenHash = (data) => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0]

/** BigNumber to hex string of specified length */
const toHex = (number, length = 32) =>
  '0x' +
  (number instanceof Buffer ? number.toString('hex') : bigInt(number).toString(16)).padStart(length * 2, '0')


/**
 * Create deposit object from secret and nullifier
 */
 function createDeposit(nullifier, secret) {
    let deposit = { nullifier, secret }
    deposit.preimage = Buffer.concat([deposit.nullifier.leInt2Buff(31), deposit.secret.leInt2Buff(31)])
    deposit.commitment = pedersenHash(deposit.preimage)
    deposit.nullifierHash = pedersenHash(deposit.nullifier.leInt2Buff(31))
    return deposit
  }


/**
 * Parses Tornado.cash note
 * @param noteString the note
 */
 function parseNote(note) {
    // we are ignoring `currency`, `amount`, and `netId` for this minimal example
    const buf = Buffer.from(note, 'hex')
    const nullifier = bigInt.leBuff2int(buf.slice(0, 31))
    const secret = bigInt.leBuff2int(buf.slice(31, 62))
    return createDeposit(nullifier, secret)
  }  
  
  /**
   * Generate merkle tree for a deposit.
   * Download deposit events from the contract, reconstructs merkle tree, finds our deposit leaf
   * in it and generates merkle proof
   * @param deposit Deposit object
   */
  async function generateMerkleProof(deposit, events) {
    const leaves = events
      .sort((a, b) => a.leafIndex - b.leafIndex) // Sort events in chronological order
      .map((e) => e.commitmentHex)
    const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves)
    // Find current commitment in the tree
    let depositEvent = events.find((e) => e.commitmentHex === toHex(deposit.commitment))
    let leafIndex = depositEvent ? depositEvent.leafIndex : -1

    assert(leafIndex >= 0, 'The deposit is not found in the tree')

    // Compute merkle proof of our commitment
    const { pathElements, pathIndices } = tree.path(leafIndex)

    return { pathElements, pathIndices, root: tree.root() }
  }

/**
 * Generate SNARK proof for withdrawal
 * @param deposit Deposit object
 * @param recipient Funds recipient
 */
 async function generateSnarkProof(deposit, recipient, fee, events) {
    // Compute merkle proof of our commitment
    const { root, pathElements, pathIndices } = await generateMerkleProof(deposit, events)
  
    // Prepare circuit input
    const input = {
      // Public snark inputs
      root: root,
      nullifierHash: deposit.nullifierHash,
      recipient: convertRHex(recipient),
      relayer: convertRHex(config.relayer),
      fee: fee || 0,
      refund: 0,
  
      // Private snark inputs
      nullifier: deposit.nullifier,
      secret: deposit.secret,
      pathElements: pathElements,
      pathIndices: pathIndices,
    }
  
    const proofData = await groth16.groth16GenProof(input, proving_key)
    return proofData
}
  

module.exports = {
    setup: setup,
    getProofForNote: getProofForNote,
    computePedersenHash: computePedersenHash
}