const express = require('express');
const http = require('http');
const app = express();
const OrderingApp = require('./OrderingApp');


const orderingApp = new OrderingApp();

const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');

   orderingApp.joinSession(socket)


   socket.on('requestOrder', (order) => {
        // console.log('Requesting order', order);
       const requestedOrder =  orderingApp.requestOrder(order);
    //    orderingApp.expireOrder(requestedOrder);
        // console.log('request', requestedOrder)
        setTimeout(() => {
            orderingApp.expireOrder(requestedOrder);
        }, 60000);
    });

    socket.on('acceptOrder', (order) => {
        orderingApp.acceptOrder(order);
    });

    socket.on('rejectOrder', (order) => {
        orderingApp.rejectOrder(order);
    });

    // to end the order 
    socket.on('finishRide', (finishedOrder) => {
        orderingApp.finishRide(finishedOrder);
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/home.html')
});

app.get('/driver', (req, res) => {
    res.sendFile(__dirname + '/driver.html');
})

app.get('/sender', (req, res) => {
    res.sendFile(__dirname + '/sender.html');
})

const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`listening on port ${port}`);
});
