
const { getProofForNote, computePedersenHash } = require('./relayer')
const { sendTransaction } = require('./wallet')
const config = require('./config');


async function withdraw(req, res) {
    console.log(req.body)
    const note = req.body.note;
    const denomination = req.body.denomination;
    const token = req.body.token;
    const recipient = req.body.recipient;
    const contractName = config.xian.contracts[token][denomination.toString()];
    if (!token) {
        res.json(400).json({error: 'No token provided'})        
        return
    }
    if (!denomination) {
        res.json(400).json({error: 'No denomination provided'})        
        return
    }
    if (!note) {
        res.json(400).json({error: 'No note provided'})        
        return
    }
    if (!recipient) {
        res.json(400).json({error: 'No recipient provided'})        
        return
    }
    if (!contractName) {
        res.json(400).json({error: 'Invalid denomination or token contract'})
        return
    }
    const fee = config.fees[token]
    if (!fee) {
        res.json(400).json({error: 'Could not find a fee for this token contract'})
        return
    }
    try {
        const proofData = await getProofForNote(note, recipient, fee, contractName);
        // submit transaction
        let returned = false
        sendTransaction(
            contractName,
            'withdraw',
            {
                a: proofData.pi_a,
                b: proofData.pi_b,
                c: proofData.pi_c,
                root: proofData.publicSignals[0],
                nullifier_hash: proofData.publicSignals[1],
                recipient: recipient,
                relayer: config.relayer,
                fee: proofData.publicSignals[4],
                refund: proofData.publicSignals[5],
            },
            config.maxStamps,
            (results) => {
                if (returned) {
                    return
                }
                returned = true
                console.log(results)
                if (results.errors) {
                    res.status(400).json({error: results.errors})
                } else {
                    res.json(results)
                }
            }
        )
    } catch(e) {
        res.status(500).json({error: e.toString()})
    }
}

async function pedersen(req, res) {
    const data = req.body.data
    const hash = computePedersenHash(data)
    return res.json({ hash: hash })
}

module.exports = {
    withdraw: withdraw,
    pedersen: pedersen
}