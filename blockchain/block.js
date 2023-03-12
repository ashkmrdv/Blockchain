const {GENESIS_DATA,MINE_RATE}=require('../config');
const {cryptoHash }= require('../util');
const  hexToBinary=require('hex-to-binary');

class Block{
    constructor({timestamp,lastHash,hash,data,nonce,difficulty}){
        this.timestamp=timestamp;
        this.data=data;
        this.hash=hash;
        this.lastHash=lastHash;
        this.nonce=nonce;
        this.difficulty=difficulty;
    }
    static genesis(){
        return new Block (GENESIS_DATA);
    }
    static mineBlock(lastBlock,data){
        const lastHash=lastBlock.hash;
        let hash,timestamp;
        let {difficulty}=lastBlock;
        let nonce=0;

        do{
            nonce++;
            timestamp=Date.now();
            difficulty=Block.adjustDifficulty({originalBlock:lastBlock,timestamp});
            hash=cryptoHash(timestamp,lastHash,data,difficulty,nonce);
        }while(hexToBinary(hash).substring(0,difficulty)!=='0'.repeat(difficulty));
        
        return new this ({
            timestamp,
            lastHash:lastHash,
            data,
            difficulty,
            nonce,
            hash
        });
    }
    static adjustDifficulty({originalBlock,timestamp}){
        const { difficulty } =originalBlock;
        const difference=timestamp-originalBlock.timestamp;

        if(difficulty<1) return 1;
        if(difference >MINE_RATE) return difficulty-1;
        return difficulty+1;
    }
}

module.exports=Block;
