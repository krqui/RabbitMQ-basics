'use strict'

const amqp= require('amqplib');
const queue = process.env.QUEUE || 'hello';
const exchangeName= process.env.EXCHANGE || 'my-topic';
const exchangeType='topic';
const pattern = process.env.PATTERN || '' // el patron hace referencia a la routingKey y debe matchear con ella
console.log({queue,exchangeName,pattern});

function intensiveOperation(){
    let i=1e9 // iterar 1 por 10 elevador a la 9
    while(i--){}
}

async function subscriber () {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel()
    /*await channel.assertQueue(queue,{
        // opciones
        durable:false // hace que no persistan los mensajes.
    })*/
    await channel.assertQueue(queue);
    // ↑ coge el nombre de la cola que le pasemos, y si no existe en Rabbit, la crea. 
    await channel.assertExchange(exchangeName,exchangeType);

    await channel.bindQueue(queue,exchangeName,pattern); // unimos la cola al exchange
    // ↑ es importante unir los bindQueue a los exchanges antes de empezar a publicar, porque sino voy a perder mensajes que se enviaron, pero nunca llegaron.
    // cuando tu bindeas la cola, al exchange le dices el nombre por el que quiero que me conozcas es el "pattern"
    // El patron puede repetirse entre multiples colas y por tanto multiples colas pueden recibir los mensajes.
    channel.consume(queue, message=> {
        const content = JSON.parse(message.content.toString())

        intensiveOperation()

        console.log(`Received message from "${queue}" queue`);
        console.log(content); // el .content seria el buffer

        channel.ack(message)
    }/*, {
        noAck:true
    }*/) // ↑ una vez que al consumidor le han sido enviados mensajes por el canal,
    // ... automaticamente se borran de la cola de rabbit. Retira de la cola de publisher sin confirmar su llegada al subscriber.
    // Explicacion:--------------------↓↓↓↓↓↓↓↓↓↓↓---------------------------↑↑↑↑↑↑↑↑↑↑↑--------------
    // si el suscriber ha recibido ya el mensaje, pero aun no lo ha procesado y muere,
    // ... el mensaje queda como enviado y se elimina de la cola aunque no se haya procesado.
    // Tu sistema creeria que todo se ha procesado bien, aunque realmente no haya sido asi.
    // Por ello, usaremos intensiveOperation, deshabilitaremos noAck y lo introduciremos por canal.
}

subscriber() // se reciben los n mensajes del publisher
    .catch(error=>{
        console.error(error);
        process.exit(1);
    })