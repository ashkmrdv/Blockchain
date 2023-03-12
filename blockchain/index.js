const Block=require('./block');
const { GENESIS_DATA ,REWARD_INPUT, MINING_REWARD} = require('../config');
const {cryptoHash}=require('../util');
const Transaction=require('../wallet/transaction');
const Wallet = require('../wallet');

class Blockchain{
    constructor(){
        this.chain=[Block.genesis()];
    }
    addBlock({ data }){
        const newBlock=Block.mineBlock(this.chain[this.chain.length-1],data);
        this.chain.push(newBlock);

    }
    static isValidChain(chain){
           for(let i=1;i<chain.length;i++){
            const {lastHash,hash,timestamp,data,nonce,difficulty}=chain[i];
            const actualLastHash=chain[i-1].hash;
            const lastDifficulty=chain[i-1].difficulty;

            if(Math.abs((lastDifficulty-difficulty)>1)) return false;

          if(lastHash!==actualLastHash)      return false;

        const validatedHash=cryptoHash(timestamp,lastHash,data,nonce,difficulty);
           if(validatedHash!==hash)  return false;
        }
        if(this.toString(chain[0])!==this.toString(GENESIS_DATA)) return false;
        return true;
    }
    replaceChain(chain, validateTransactions, onSuccess){
        if(chain.length<=this.chain.length){
            console.error('The incoming chain must be longer');
            return;
        }
        if(!Blockchain.isValidChain(chain)){
            console.error('The incoming chain must be valid');
            return;
        }
        if(validateTransactions && !this.validTransactionData({chain})){
            console.error('The incoming chain has invalid data');
            return ;
        }

        if(onSuccess) onSuccess();
        console.log('Replacing chain with ',chain);
        this.chain=chain;
    }

    validTransactionData({chain}){
        for(let i=1;i<chain.length;i++){
            const block=chain[i];
            const transactionSet=new Set();
            let rewardTransactionCount=0;

            for(let transaction of block.data){
                if(transaction.input.address===REWARD_INPUT.address){
                    rewardTransactionCount+=1;

                    if(rewardTransactionCount>1){
                        console.error('Miner rewards exceed limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0]!==MINING_REWARD){
                    console.error('Miner reward amount is invalid');
                    return false;
                    }   
                }else{
                    if(!Transaction.validTransaction(transaction)){
                        console.error('Invalid Transaction');
                        return false;
                    }
                    const trueBalance=Wallet.calculateBalance({
                        chain:this.chain,
                        address:transaction.input.address
                    });
                    if(transaction.input.amount!==trueBalance){
                        console.error('Invalid input amount');
                        return false;
                    }
                    if(transactionSet.has(transaction)){
                        console.error('An identical transaction appears more than once in the block');
                        return false;
                    }else{
                        transactionSet.add(transaction);
                    }
                }  
            }
        }
        return true;
    }
}
module.exports=Blockchain;