const { MasternodeAPI } = require("xian-js");

const network_info = {
    name: "Xian Testnet",
    currencySymbol: "Xian",
    chain_id: "xian-testnet-1",
    masternode_hosts: ["https://testnet.xian.org"]
};

async function run() {
    const api = new MasternodeAPI(network_info);

    let address = 'ef0e2de819ea8060e3de26fa322c71e581152dd2f282cbcda6f5655bc64db5d9';
    console.log("Address: ", address);
    //const contractInfo = await api.getContractInfo("currency");
    //console.log(contractInfo);
    // Get account balance
    const balance = await api.getCurrencyBalance(address);
    console.log("Balance: ", balance.toString());
    // Get transaction details
    //const tx = await api.getTxResult(txHash);

    // Get contract variables
    const variables = await api.getContractVariables("currency");
    console.log("Variables: ", variables);
    const state = await api.getVariable("currency", `balances:${address}`);
    console.log("State: ", state);
}


run().then(() => {
    console.log("Done");
}).catch((err) => {
    console.log(err);
});