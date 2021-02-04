# EZ-MQTTRelay
![Continuous Integration](https://github.com/bblacey/ez-mqttrelay/workflows/Continuous%20Integration/badge.svg)![Docker to ghcr.io](https://github.com/bblacey/ez-mqttrelay/workflows/Docker%20to%20ghcr.io/badge.svg)

Easy (EZ) Node.js app that relays all [ui_broadcast](https://api.ezlo.com/hub/broadcasts/index.html) messages from Ezlo hubs discovered on the local area network to an MQTT broker.  For convenience, the app is deployed as a dockerized app.

All messages are posted to the MQTT topic `Ezlo/<hub serial>/<msg_subclass>/<deviceId>`

## Motivation
Example EZ-App to illustrate the simplicity of observing Ezlo Hub `ui_broadcast` messages using the [ezlo-hub-kit](bblacey/ezlo-hub-kit) SDK.  

This EZ-App also appeals to Ezlo users that would like to push their Ezlo controller/hub data to a time-series database (e.g. InfluxDB) for graphical reporting and analysis (e.g. Grafana).

## Usage
1. Start the dockerized EZ-MQTTRelay
```shell
$ docker run -it --network host \
             --name ez-mqtt-relay \
             -e miosUser=<MIOS Portal User> \
             -e miosPassword=<MIOS Password> \
             -e mqttBrokerUrl=<Local Broker URL> \
             ghcr.io/bblacey/ez-mqttrelay
```
2. Verify that the application starts successfully, connects to the MQTT broker, discovers the local Ezlo hubs and receives `ui_broadcast` messages.  
    * NOTE: You can force a hub to publish a `ui_broadcast` message simply by activating a device on an Ezlo hub using the Vera application (e.g. turn a light on or off, change house mode, etc.)
```shell
Connected to mqtt broker mqtt://192.168.0.104
Observing: 90000369, architecture: armv7l	, model: h2.1	, firmware: 2.0.7.1313.2, uptime: 0d 13h 35m 2s
Observing: 90000330, architecture: armv7l	, model: h2.1	, firmware: 2.0.7.1313.2, uptime: 0d 14h 50m 55s
Observing: 45006642, architecture: mips	  , model: g150	, firmware: 2.0.5.1213.2, uptime: 0d 8h 46m 32s
Observing: 70060017, architecture: esp32	, model: ATOM32  , firmware: 0.8.528, uptime: 4d 10h 11m 16s
Observing: 70060095, architecture: esp32	, model: ATOM32  , firmware: 0.8.528, uptime: 0d 23h 15m 57s
Observing: 92000014, architecture: armv7l	, model: h2_secure.1	, firmware: 2.0.7.1313.16, uptime: 2d 8h 9m 5s

Mon, 11 Jan 2021 01:29:14 GMT 70060095:ui_broadcast {
  id: 'ui_broadcast',
  msg_subclass: 'hub.item.updated',
  msg_id: 1841934316,
  result: {
    _id: 'DA79ACF7',
    deviceId: 'ZC5F00207',
    deviceName: 'Landscape 1-4',
    deviceCategory: 'dimmable_light',
    deviceSubcategory: 'dimmable_colored',
    serviceNotification: false,
    roomName: 'Exterior',
    userNotification: false,
    notifications: null,
    name: 'electric_meter_watt',
    valueType: 'power',
    value: 20.2,
    scale: 'watt',
    syncNotification: false
  }
}
```

3. Confirm that the messages displayed in the docker logs reach the MQTT broker.  There are many ways to accomplish this but one simple method is to open a new terminal window and use the `mosquitto_sub` command to subscribe to the `Ezlo/#` MQTT topic.  In the excerpt below, the MQTT broker is running on host 192.168.0.104.
```shell
$ $ mosquitto_sub -t 'Ezlo/#' -v -h 192.168.0.104
Ezlo/70060095/hub.item.updated/ZC5F00207 {"id":"ui_broadcast","msg_subclass":"hub.item.updated","msg_id":1841934316,"result":{"_id":"DA79ACF7","deviceId":"ZC5F00207","deviceName":"Landscape 1-4","deviceCategory":"dimmable_light","deviceSubcategory":"dimmable_colored","serviceNotification":false,"roomName":"Exterior","userNotification":false,"notifications":null,"name":"electric_meter_watt","valueType":"power","value":20.2,"scale":"watt","syncNotification":false}}
```

If everything is operating correctly, `ui_broadcast` messages will appear in both the `ez-mqttrelay` docker log file and the `mosquitto_sub` terminal window simultaneously.

At this point, you can terminate the sample run by typing control-c.

### Production use

To run the dockerized EZ-MQTTRelay as a persistent process you can use docker-compose (recommended) or run the docker container 'detached' as a background process.

First, for either option, create or download [config.env](config.env) and edit the file to to use your MIOS portal username, password and MQTT broker URL.

#### *docker-compose* (recommended)
For those users who prefer to use `docker-compose`, you can download the [docker-compose.yml](docker-compose.yml) and start the relay with.
```shell
docker-compose up -d .
```
Compose users may find this [GitHub gist](https://gist.github.com/bblacey/9414231d29132a1f40c38f8ec04a915d) useful.  It is a docker-compose that will start all EZ-Apps with in a single compose file.

#### *docker run --detatch* (alternative)
Start the relay in detached mode.
```shell
$ docker run --detach --network host \
             --name ez-mqttrelay \
             --env-file config.env \
             ghcr.io/bblacey/ez-mqttrelay
```

## The App
Take a look at the [Source code](node-app/index.js) for the app - it is really simple and illustrates the benefits of an expressive [ezlo-hub-kit](bblacey/ezlo-hub-kit) for rapid application development.

## Futures
The scope for this EZ-App was intentionally limited for this initial [ezlo-hub-kit](bblacey/ezlo-hub-kit) proof-of-concept example app but it would be very straight-forward for fellow developers to extend it and submit pull requests.  The obvious features are supporting MQTT broker authentication and extending the relay to be bi-directional (i.e. execute hub actions).

#### 1. MQTT Authentication
In the interest of brevity, the example app does not include MQTT authentication but it is a straight forward extension.  Implementing this feature would simply entail adding the MQTT Broker username and password to the [config.env](config.env) file and modifying the example app to retrieve the environment variables and pass them to the MQTT broker `connect()` method.

#### 2. Bi-directional relay
Extending the ez-MQTTRelay to be bi-directional (e.g. perform hub actions) is also straight-forward because the [ezlo-hub-kit](bblacey/ezlo-hub-kit) provides methods to run scenes and control devices.

The relay would need to subscribe to incoming messages using the MQTT `client.subscribe('Ezlo/#', cb())` and add a message handler using the `client.on('message', function())` method to forward the actions to the hub.  In additiona, an MQTT message scheme would need to be defined to represent hub actions.  

As an illustation, consider the MQTT messsage scheme below:

##### *MQTT Message Schema (illustration)*  
`Ezlo/<premises>/<hub|ALL>/<action>/<id>/<arguments>`

The following MQTT (RunScene and SetItem) messages would map to the `ezlo-hub-kit` as follows:

###### *Run a scene*
`Ezlo/Home/90000369/RunScene/Sleep` => `hub[90000369].scene('Sleep').then((scene) => runScene(scene._id))`

###### *Turn off a device*
`Ezlo/Home/90000369/SetItem/5fd39c49129ded1201c7e122/false` => `hub[90000369].setItem(5fd39c49129ded1201c7e122, false)`

###### *Dim a light to 50%*
`Ezlo/Home/90000369/SetItem/5fd39c49129ded1201c7e123/false` => `hub[90000369].setItem(5fd39c49129ded1201c7e123, 50)`

I will happily accept GitHub [pull requests](https://docs.github.com/en/free-pro-team@latest/desktop/contributing-and-collaborating-using-github-desktop/creating-an-issue-or-pull-request) that extend **EZ-MQTTRelay** in this direction.