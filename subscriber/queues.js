'use strict'

const amqp= require('amqplib');// esta es la version con promesas, hay otra con callbacks.
const queue = process.env.QUEUE || 'hello';

function intensiveOperation(){
    let i=1e9 // iterar 1 por 10 elevador a la 9
    while(i--){}
}

async function subscriber () {
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
    await channel.assertQueue(queue);
    // ↑ coge el nombre de la cola que le pasemos, y si no existe en Rabbit, la crea. 
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
