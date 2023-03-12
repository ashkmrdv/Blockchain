const express =require('express');
const request=require('request');
const path =require('path');
const bodyParser=require('body-parser');
const Blockchain=require('./blockchain');
const PubSub=require('./app/pubsub');
const TransactionPool=require('./wallet/transaction-pool');
const Wallet=require('./wallet');
const TransactionMiner=require('./app/transaction-miner');

const app=express();
const blockchain=new Blockchain();
const transactionPool=new TransactionPool();
const wallet=new Wallet();
const pubsub=new PubSub({blockchain, transactionPool});
const transactionMiner=new TransactionMiner({blockchain,transactionPool,wallet,pubsub});

const DEFAULT_PORT=3000;
const ROOT_NODE_ADDRESS=`http://localhost:${DEFAULT_PORT}`;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'client/dist')));

app.get('/api/blocks',(req,res)=>{
    res.json(blockchain.chain);
});

app.post('/api/mine',(req,res)=>{
    const {data}=req.body;
    blockchain.addBlock({data});

    pubsub.broadcastChain();

    res.redirect('/api/blocks');

});

app.post('/api/transact',(req,res)=>{
    const {amount,recipient} =req.body;

    let transaction=transactionPool.existingTransaction({ inputAddress:wallet.publicKey});

    try{
        if(transaction){
            transaction.update({senderWallet:wallet, recipient,amount});
        }
        else{
            transaction=wallet.createTransaction({
                recipient,
                amount,
                chain:blockchain.chain
            });
        }
    }
    catch(error){
        return res.status(400).json({type:'error',message:error.message});
    }
   
    transactionPool.setTransaction(transaction);

    pubsub.broadcastTransaction(transaction);

    res.json({type:'success',transaction});
    });
    app.get('/api/transaction-pool-map',(req,res)=>{
        res.json(transactionPool.transactionMap);
});

app.get('/api/mine-transactions',(req,res)=>{
    transactionMiner.mineTransaction();

    res.redirect('/api/blocks');
});

app.get('/api/wallet-info',(req,res)=>{
    const address=wallet.publicKey;

    res.json({address:wallet.publicKey,
    balance:Wallet.calculateBalance({chain:blockchain.chain,address:wallet.publicKey})})
});

app.get('*',(req,res)=>{
    res.sendFile(path.join(__dirname,'client/dist/index.html'));
});

const syncWithRootState=()=>{
    request({url:`${ROOT_NODE_ADDRESS}/api/blocks`},(error,response,body)=>{
        if(!error&& response.statusCode===200){
            const rootChain=JSON.parse(body);

            console.log('Replace chain on a sync with',rootChain);
            blockchain.replaceChain(rootChain);
        }

    });
    request({url:`${ROOT_NODE_ADDRESS}/api/transaction-pool-map`},(error,response,body)=>{
        if(!error&&response.statusCode===200){
            const rootTransactionPoolMap=JSON.parse(body);

            console.log('replace transaction pool map on a sync with',rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
};

const walletTest1=new Wallet();
const walletTest2=new Wallet();

const generateWalletTransaction=({wallet,recipient,amount})=>{
    const transaction=wallet.createTransaction({
        recipient,amount,chain:blockchain.chain
    });

    transactionPool.setTransaction(transaction);
};

const walletAction=()=>generateWalletTransaction({
    wallet,recipient:walletTest1.publicKey,amount:5
});

const walletTest1Action=()=>generateWalletTransaction({
    wallet:walletTest1,recipient:walletTest2.publicKey,amount:10
});

const walletTest2Action=()=>generateWalletTransaction({
    wallet:walletTest2,recipient:wallet.publicKey,amount:15
});

for(i=0;i<10;i++){
    if(i%3===0){
        walletAction();
        walletTest1Action();
    } else if(i%3===1){
        walletAction();
        walletTest2Action();
    }else{
        walletTest1Action();
        walletTest2Action();
    }
    transactionMiner.mineTransaction();
}

let PEER_PORT;


if(process.env.GENERATE_PEER_PORT==='true'){
    PEER_PORT=DEFAULT_PORT+Math.ceil(Math.random()*1000);
}

const PORT=PEER_PORT||DEFAULT_PORT;
app.listen(PORT,()=>{
    console.log(`listening at localhost:${PORT}`);

    if(PORT!==DEFAULT_PORT){
        syncWithRootState();
    }

});