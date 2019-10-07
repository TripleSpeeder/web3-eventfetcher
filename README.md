# web3-eventfetcher
Fetch past Ethereum contract events asynchronous with progress update

Fetching past events over a large blockrange can take a long time. Web3-eventfetcher provides a simple API that collects
events in chunks and optionally provides progress updates via callback function.

## Installation
```bash
npm install @triplespeeder/web3-eventfetcher
```

## Usage
Web3-eventfetcher needs a contract instance that provides the "getPastEvents" method as provided by web3.js or 
@truffle/contract. 
### Fetch options
To start fetching events an Options object needs to be provided:
```javascript
{
    contract: <instance>,         // The contract instance. Required!
    eventName: <string>,          // The event to look for. Required!
    fromBlock: <number>,          // Required!
    toBlock: <number>,            // Required!
    filter: <filter object>,      // Optional filter as described in https://web3js.readthedocs.io/en/v1.2.0/web3-eth-contract.html#getpastevents 
    progressCallback: <function>, // Optional progress callback. See below
    chunkSize: <number>,          // Optional. Sets the number of blocks that are queried on one call. E.g. looking
                                  // at 1000 Blocks with a chunksize of 50 results in 20 backend requests (and 20 
                                  // progress callbacks). Default value: 100
}
```

### Initializing and fetching events
```javascript
const EventFetcher = require('eventFetcher')

/* Initialize contract instance using @truffle/contract */
const erc20ABI = require('human-standard-token-abi')
const contract = require('@truffle/contract')

const tetherUSDTAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const ERC20Contract = contract({abi: erc20ABI})
ERC20Contract.setProvider(web3.currentProvider)
contractInstance = await ERC20Contract.at(tetherUSDTAddress)

const callbackFunction = function(stepsComplete, totalSteps, percentageComplete, stepResults) {
    console.log(`Progress: Step ${stepsComplete} of ${totalSteps} (${percentageComplete}%).`
}

/* Fetch events */
let eventFetcher = new EventFetcher()
const fetchOptions = {
  contract: contractInstance,
  eventName: 'Approval',
  fromBlock: 8661209,
  toBlock: 8662209,
}
let events = await eventFetcher.fetch(fetchOptions)
console.log(events)
```

### Progress callback
The optional progressCallback function gets called after each chunk (see "chunksize" above) with these parameters:
```
stepsComplete: Number of steps/chunks that are done
totalSteps: Total number of steps/chunks to be completed
percentageComplete: Percentage of steps completed
stepResults: Array of event results that were fetched with the last step.

```

### Cancel fetching
To cancel fetching of events call ```eventFetcher.cancel()```. EventFetcher will stop after the current chunk is 
received and not return any events.
