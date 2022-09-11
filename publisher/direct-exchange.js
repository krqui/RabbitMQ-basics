'use strict'

const amqp= require('amqplib');
const exchangeName= process.env.EXCHANGE || 'my-direct';
const routingKey=process.env.ROUTING_KEY || ''; 
// ↑ es lo que le asociamos a una cola para saber si le debemos enviar un mensaje a esa cola, dependiendo del tipo de exchange.
const exchangeType = 'direct';

console.log({exchangeName, exchangeType, routingKey});

const messagesAmount= 6
const wait = 400;//milisegundos

function sleep(ms) {
    return new Promise((resolve)=>{
        setTimeout(resolve,ms)
    })
}

async function sleepLoop(number,cb){
    while(number--){
        await sleep(wait)

        cb()
    }
}

async function exitAfterSend() {
    await sleep(messagesAmount*wait*1.2)

    process.exit(0)
}

async function publisher () {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel()
    /*await channel.assertQueue(queue,{
        // opciones
        durable:false // hace que no persistan los mensajes.
    })*/ 
    await channel.assertExchange(exchangeName,exchangeType);
    // ↑ si no existe el exchange, lo crea.

    sleepLoop(messagesAmount,()=>{
        const message={
            id:Math.random().toString(32).slice(2,6),
            text:'Hello world'
        }
    
        const sent = channel.publish(
            exchangeName,
            routingKey,
            Buffer.from(JSON.stringify(message)),
            {
            // persistent:true
            }
        )
        // ↑ tenemos que crear un buffer
        // el objeto lo debemos pasar como string
        // nos devolvera true o false dependiendo de si se ha creado correctamente o no.
    
        sent? console.log(`Sent message to "${exchangeName}" queue`,message)
            : console.log(`Fails sending message to "${exchangeName}" queue`,message);

    })
}

publisher()
    .catch(error=>{
        console.error(error);
        process.exit(1);
    })
// el message no se va a perder hasta que no haya un suscriber, a no
// ser que lo reiniciemos pues ahora no estamos en modo persistente.

exitAfterSend()
