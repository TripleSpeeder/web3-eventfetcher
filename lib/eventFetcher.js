let web3
const chunkSize = 100

const getChunks = async (contractInstance, eventName, filter, fromBlock, toBlock) => {
    const options = {
        filter: filter,
        fromBlock: fromBlock,
        toBlock: toBlock,
    }
    return await contractInstance.getPastEvents(eventName, options)
}

module.exports = {
    init: (_web3) => {
        web3 = _web3
    },
    /*
    Expected searchOptions:
    {
        contract: Contract instance that supports "getPastEvents()" method
        eventName: String of the event name to look for
        filter: *Optional* Filter object as required by web3 (See https://web3js.readthedocs.io/en/v1.2.1/web3-eth-contract.html#id39)
        fromBlock: The block number from which to get events on.
        toBlock: The block number to get events up to (or "latest")
        progressCallBack: *Optional* function to call with progress updates
        chunkSize: *Optional* How many blocks to check between progress update. Defaults to 100.
    }
    */
    getEvents: async (eventOptions) => {
        const {contract, eventName, filter, fromBlock, progressCallback} = eventOptions

        // Handle 'latest' for toBlock. I still need a blocknumber to calculate chunks etc.
        let toBlock = eventOptions.toBlock
        if (toBlock === 'latest') {
            toBlock = await web3.eth.getBlockNumber()
        }

        // Handle chunksize
        let chunkSize = eventOptions.chunkSize
        if (!chunkSize) {
            chunkSize = 100
        }

        const blocksToCheck = toBlock - fromBlock
        const numChunks = Math.ceil(blocksToCheck / chunkSize)
        let events = []
        for (chunk = 0; chunk < numChunks; chunk++) {
            const chunkFrom = fromBlock + (chunk * chunkSize)
            const chunkTo = Math.min((chunkFrom + chunkSize), toBlock)
            // console.log(`Getting chunk ${chunk} from ${chunkFrom} to ${chunkTo}`)
            let eventsChunk = await getChunks(contract, eventName, filter, chunkFrom, chunkTo)

            if (progressCallback) {
                const percentage = Math.floor(100 * (chunk + 1) / numChunks)
                progressCallback(chunk + 1, numChunks, percentage, eventsChunk)
            }

            events = events.concat(eventsChunk)
        }
        return events
    },
}

