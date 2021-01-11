const mqtt = require('mqtt');
const { EzloCloudResolver, discoverEzloHubs, UIBroadcastMessagePredicate } = require('@bblacey/ezlo-hub-kit');

function main() {

    const hubs = [];

    // Retrieve the mqtt and user credentials from the environment
    const mqttBrokerUrl = process.env.mqttBrokerUrl;
    const miosUser = process.env.miosUser;
    const miosPassword = process.env.miosPassword;

    // Connect to the MQTT broker
    const client  = mqtt.connect(mqttBrokerUrl)
    client.on('connect', () => console.log(`connected to mqtt broker ${mqttBrokerUrl}`));

    // Discover all local Ezlo Hubs
    discoverEzloHubs(new EzloCloudResolver(miosUser, miosPassword), async (hub) => {

        // Report the information about the discovered hub
        const info = await hub.info();
        console.log('Observing: %s, architecture: %s\t, model: %s\t, firmware: %s, uptime: %s',
                     info.serial, info.architecture, info.model, info.firmware, info.uptime);

        // Register to receive the ui_broadcast messages from this hub and publish to MQTT broker
        hub.addObserver( UIBroadcastMessagePredicate, (msg) => {
            console.log('%s %s:ui_broadcast %o\n', (new Date().toUTCString()), hub.identity, msg);
            client.publish(`Ezlo/${hub.identity}/${msg.msg_subclass}/${msg.result.deviceId}`, JSON.stringify(msg));
        });

	// Track hubs for clean shutdown on exit
	hubs.push(hub);
    });

    // Shutdown in a clean manner
    process.on('SIGTERM', () => {
        console.log('Disconnecting from ezlo hubs and mqtt broker');
        Promise.all(hubs.map(hub => hub.disconnect()))
        .then(() => {
            client.end();
            process.exit();
        });
    });
}

try {
    main();
} catch (err) {
    console.log('Unexecpted error occurred - %O', err);
}
