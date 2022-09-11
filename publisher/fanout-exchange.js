'use strict'

const amqp= require('amqplib');// la version con promesas te da un codigo mas limpio.
const exchangeName= process.env.EXCHANGE || 'my-fanout';
const exchangeType= 'fanout';

console.log({exchangeName,exchangeType});

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
    //amqp:// ←→ es el protocolo que se va a utliizar. 
    //Que por debajo lo que utiliza es tcp de todas formas.
    // Pero en la capa de aplicacion utiliza amqp.
    // va a utilizar el puerto por defecto que es el 5672
    const channel = await connection.createChannel()
    // vamos a crear un canal ↑
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
            '',// ← es la routing key, pero al ser Fanout la vamos a dejar como string vacia.
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
// el message no se va a perder hasta que no haya un suscriber,
// a no ser que lo reiniciemos pues ahora no estamos en modo persistente.

exitAfterSend()
