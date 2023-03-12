const hexToBinary=require('hex-to-binary');
const Block=require('./block');
const { GENESIS_DATA ,MINE_RATE} = require('../config');
const {cryptoHash}=require('../util');

describe('Block',()=>{
    const timestamp=2000;
    const lastHash='test-lastHash';
    const hash='test-hash';
    const data='test-data';
    const nonce=1;
    const difficulty=1;
    const block=new Block({timestamp,data,lastHash,hash,nonce,difficulty});
    

    it("Has a timestamp",()=>{
        expect(block.timestamp).toEqual(timestamp);
    });
    it("Has a lastHash",()=>{
        expect(block.lastHash).toEqual(lastHash);
    });
    it("Has a hash",()=>{
        expect(block.hash).toEqual(hash);
    });
    it("Has a data",()=>{
        expect(block.data).toEqual(data);
    });
    it("Has a nonce",()=>{
        expect(block.nonce).toEqual(nonce);
    });
    it("Has a difficulty",()=>{
        expect(block.difficulty).toEqual(difficulty);
    });

    describe('genesis()',()=>{
        const genesisBlock=Block.genesis();

        it("Returns a Block instance",()=>{
            expect(genesisBlock instanceof Block).toBe(true);
        });
        it("Returns the genesis data",()=>{
            expect(genesisBlock).toEqual(GENESIS_DATA);
        });
    });

    describe('mineblock()',()=>{
        const lastBlock=Block.genesis();
        const data='test-mine-data';
        const minedBlock=Block.mineBlock(lastBlock,data);

        it('Returns a Block instance',()=>{
            expect(minedBlock instanceof Block).toBe(true);
        });
        it('Sets the hash of previous block as the hash of the current block',()=>{
            expect(lastBlock.hash).toEqual(minedBlock.lastHash);
        });
        it('Sets the data right',()=>{
            expect(data).toEqual(minedBlock.data);
        });
        it('Sets the timestamp',()=>{
            expect(minedBlock.timestamp).not.toEqual(undefined);
        });
        it('Creates a SHA-256 hash based on the proper inputs',()=>{
            expect(minedBlock.hash).toEqual(
                cryptoHash(
                    minedBlock.timestamp,
                    minedBlock.difficulty,
                    minedBlock.nonce,
                    lastBlock.hash,
                    data
                ));
            });
        it('sets a hash that matches the difficulty criteria',()=>{
        expect(hexToBinary(minedBlock.hash).substring(0,minedBlock.difficulty)).toEqual('0'.repeat(minedBlock.difficulty));
        });
        it('adjusts the difficulty',()=>{
            const possibleResults=[lastBlock.difficulty+1,lastBlock.difficulty-1];

            expect((possibleResults).includes(minedBlock.difficulty)).toBe(true);
        });
    });

    describe('adjustDifficulty()',()=>{
        it('raises the difficulty for a quickly mined block',()=>{
            
            expect (Block.adjustDifficulty({
                originalBlock:block,
                timestamp:block.timestamp+MINE_RATE-100})).toEqual(block.difficulty+1)
        });
        it('lowers the difficulty for a slowly mined block',()=>{
            expect (Block.adjustDifficulty({
                originalBlock:block,
                timestamp:block.timestamp+MINE_RATE+100})).toEqual(block.difficulty-1);
        });
        it('Has a lower limit of 1',()=>{
            block.difficulty=-1;
            expect(Block.adjustDifficulty({originalBlock: block})).toEqual(1);
        });
        });
    });