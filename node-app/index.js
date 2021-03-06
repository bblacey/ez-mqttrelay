'use strict';

const mqtt = require('mqtt');
const { EzloCloudResolver, discoverEzloHubs, UIBroadcastPredicate } = require('ezlo-hub-kit');

// Shutdown in a clean manner
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Track hubs for clean shutdown on exit
const hubs = {};

// Retrieve the mqtt and user credentials from the environment
const mqttBrokerUrl = process.env.mqttBrokerUrl;
const miosUser = process.env.miosUser;
const miosPassword = process.env.miosPassword;

// Connect to the MQTT broker
const client = mqtt.connect(mqttBrokerUrl)
client.on('connect', () => console.log(`Connected to mqtt broker ${mqttBrokerUrl}`));

// Discover all local Ezlo Hubs
discoverEzloHubs(new EzloCloudResolver(miosUser, miosPassword), async (hub) => {

    // Report the information about the discovered hub
    const info = await hub.info();
    console.log('Observing: %s, architecture: %s\t, model: %s\t, firmware: %s, uptime: %s',
                    info.serial, info.architecture, info.model, info.firmware, info.uptime);

    // Register to receive the ui_broadcast messages from this hub and publish to MQTT broker
    hub.addObserver( UIBroadcastPredicate, (msg) => {
        console.log('%s %s:ui_broadcast %o\n', (new Date().toUTCString()), hub.identity, msg);
        client.publish(`Ezlo/${hub.identity}/${msg.msg_subclass}/${msg.result.deviceId}`, JSON.stringify(msg));
    });

    hubs[hub.identity] = hub;
});

function shutdown() {
    console.log('Disconnecting from ezlo hubs and mqtt broker');
    Promise.all(Object.values(hubs).map(hub => hub.disconnect()))
    .then(() => {
        client.end();
        process.exit();
    });
}
