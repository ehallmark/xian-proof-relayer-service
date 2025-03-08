const config = require("./config")

async function status(req, res) {
    return res.json({status: 'ok'})
}

async function fees(req, res) {
    return res.json({fees: config.fees})
}

module.exports = {
    status: status,
    fees: fees,
}