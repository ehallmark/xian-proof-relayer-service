require('dotenv').config()

const mainnet = {
}

const testnet = {
  apiLink: "https://testnet-explorer.xian.org/",
  network: {
    name: "Xian Testnet",
    currencySymbol: "XIANt",
    chain_id: "xian-testnet-1",
    masternode_hosts: ["https://testnet.xian.org"]
  },
  contracts: {
    currency: {
      1: 'con_ozark_interface_fake',
    },
  }
} 

const xian = process.env.NETWORK === 'mainnet' ? mainnet : testnet

module.exports = {
  port: process.env.PORT || 5000,
  privateKey: process.env.PRIVATE_KEY,
  apiLink: xian.apiLink,
  relayer: process.env.RELAYER_ADDRESS,
  fees: {
    currency: process.env.WITHDRAW_FEE_CURRENCY,
  },
  maxStamps: parseInt(process.env.MAX_STAMPS || '5000', 10),  
  xian: xian,
  mongoUri: process.env.MONGO_URI
}
