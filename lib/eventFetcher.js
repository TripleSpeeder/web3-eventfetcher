
function EventFetcher() {
    this.shouldCancel = false
}

EventFetcher.prototype.getChunks = async function(contract, eventName, chunkFrom, chunkTo, filter) {
    const options = {
        filter: filter,
        fromBlock: chunkFrom,
        toBlock: chunkTo,
    }
    return await contract.getPastEvents(eventName, options)
}

EventFetcher.prototype.cancel = function() {
    this.shouldCancel = true
}

EventFetcher.prototype.fetch = async function(options) {
    const contract = options.contract
    const eventName = options.eventName
    const filter = options.filter
    const fromBlock = options.fromBlock
    const toBlock = options.toBlock
    const progressCallback = options.progressCallback
    const chunkSize = options.chunkSize || 100

    const blocksToCheck = toBlock - fromBlock
    const numChunks = Math.ceil(blocksToCheck / chunkSize)
    let events = []
    for (let chunk = 0; chunk < numChunks; chunk++) {
        if (this.shouldCancel) {
            // client not interested in results anymore. Just cease to exist.
            // console.log(`Fetcher for contract ${contract.address} cancelled at chunk ${chunk} of ${numChunks}`)
            this.shouldCancel = false;
            return []
        }
        const chunkFrom = fromBlock + (chunk * chunkSize)
        const chunkTo = Math.min((chunkFrom + chunkSize), toBlock)
        // console.log(`Getting chunk ${chunk} from ${chunkFrom} to ${chunkTo}`)
        let eventsChunk = await this.getChunks(contract, eventName, chunkFrom, chunkTo, filter)
        if (progressCallback) {
            const percentage = Math.floor(100 * (chunk + 1) / numChunks)
            progressCallback(chunk + 1, numChunks, percentage, eventsChunk)
        }
        events = events.concat(eventsChunk)
    }
    return events
}

module.exports = EventFetcher
