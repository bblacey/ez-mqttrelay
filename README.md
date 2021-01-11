# Ezlo-MQTTRelay
Nodejs app that relays all [ui_broadcast](https://api.ezlo.com/hub/broadcasts/index.html) messages from Ezlo hubs discovered on the local area network to an MQTT broker.  The app is deployed as a self-contained docker container.

All messages are posted to the MQTT topic `Ezlo/<hub serial>/<msg_subclass>/<deviceId>`

## Motivation
Developed as an [ezlo-api](https://github.com/bblacey/ezlo-api) example app to illustrate ezlo-api](https://github.com/bblacey/ezlo-api) use in an off-hub app.  It also appeals to Ezlo users that would like to push controller/hub data to a time-series database (e.g. InfluxDB) for graphical reporting and analysis (e.g. Grafana).

## Usage
1. Clone this GitHub repository
```shell
$ git clone https://github.com/bblacey/ezlo-mqttrelay
$ cd ezlo-mqttrelay
```
2. Edit the [config.env](config.env) configuration file to to use your MIOS portal username, password and MQTT broker URL.
3. Build and start the docker image
```shell
$ docker-compose up -d
```
4. Verify that the application starts successfully, connects to the mqtt broker, discovers the local Ezlo hubs and receives `ui_broadcast` messages.  
    * NOTE: You can force a hub to publish a `ui_broadcast` message simply by activating a device on an Ezlo hub using the Vera application (e.g. turn a light on or off, change house mode, etc.)
```shell
$ docker-compose logs --follow
Attaching to ezlo-mqttrelay
ezlo-mqttrelay    | connected to mqtt broker mqtt://192.168.0.104
ezlo-mqttrelay    | Observing: 90000369, architecture: armv7l	, model: h2.1	, firmware: 2.0.7.1313.2, uptime: 0d 13h 35m 2s
ezlo-mqttrelay    | Observing: 90000330, architecture: armv7l	, model: h2.1	, firmware: 2.0.7.1313.2, uptime: 0d 14h 50m 55s
ezlo-mqttrelay    | Observing: 45006642, architecture: mips	  , model: g150	, firmware: 2.0.5.1213.2, uptime: 0d 8h 46m 32s
ezlo-mqttrelay    | Observing: 70060017, architecture: esp32	 , model: ATOM32  , firmware: 0.8.528, uptime: 4d 10h 11m 16s
ezlo-mqttrelay    | Observing: 70060095, architecture: esp32	 , model: ATOM32  , firmware: 0.8.528, uptime: 0d 23h 15m 57s
ezlo-mqttrelay    | Mon, 11 Jan 2021 01:02:12 GMT 70060095:ui_broadcast {
ezlo-mqttrelay    | Mon, 11 Jan 2021 01:29:14 GMT 70060095:ui_broadcast {
ezlo-mqttrelay    |   id: 'ui_broadcast',
ezlo-mqttrelay    |   msg_subclass: 'hub.item.updated',
ezlo-mqttrelay    |   msg_id: 1841934316,
ezlo-mqttrelay    |   result: {
ezlo-mqttrelay    |     _id: 'DA79ACF7',
ezlo-mqttrelay    |     deviceId: 'ZC5F00207',
ezlo-mqttrelay    |     deviceName: 'Landscape 1-4',
ezlo-mqttrelay    |     deviceCategory: 'dimmable_light',
ezlo-mqttrelay    |     deviceSubcategory: 'dimmable_colored',
ezlo-mqttrelay    |     serviceNotification: false,
ezlo-mqttrelay    |     roomName: 'Exterior',
ezlo-mqttrelay    |     userNotification: false,
ezlo-mqttrelay    |     notifications: null,
ezlo-mqttrelay    |     name: 'electric_meter_watt',
ezlo-mqttrelay    |     valueType: 'power',
ezlo-mqttrelay    |     value: 20.2,
ezlo-mqttrelay    |     scale: 'watt',
ezlo-mqttrelay    |     syncNotification: false
ezlo-mqttrelay    |   }
ezlo-mqttrelay    | }
```

5. Confirm that the messages displayed in the docker-compose logs reach the MQTT broker.  There are many ways to accomplish this but one simple method is to open a new terminal window use the `mosquitto_sub` command to subscribe to the `Ezlo#` MQTT topic.  In the excerpt below, the MQTT broker is running on host 192.168.0.104.
```shell
$ $ mosquitto_sub -t 'Ezlo/#' -v -h 192.168.0.104
Ezlo/70060095/hub.item.updated/ZC5F00207 {"id":"ui_broadcast","msg_subclass":"hub.item.updated","msg_id":1841934316,"result":{"_id":"DA79ACF7","deviceId":"ZC5F00207","deviceName":"Landscape 1-4","deviceCategory":"dimmable_light","deviceSubcategory":"dimmable_colored","serviceNotification":false,"roomName":"Exterior","userNotification":false,"notifications":null,"name":"electric_meter_watt","valueType":"power","value":20.2,"scale":"watt","syncNotification":false}}
```

If everything is operating correctly, `ui_broadcast` messages will appear in both the `ezlo-mqttrelay` log file and the `mosquitto_sub` terminal window simultaneously.

## The App
Take a look at the [Source code](node-app/index.js) for the app - it is really simple and illustrates the benefits of an expressive [ezlo-api](https://github.com/bblacey/ezlo-api) for rapid application development.

## Futures
The scope was intentionally limited for this initial [ezlo-api](https://github.com/bblacey/ezlo-api) proof-of-concept example app but it would be very straight-forward for fellow developers to extend it and submit pull requests.  The obvious features are supporting MQTT broker authentication and extending the relay to be bi-directional (i.e. execute hub actions).

#### 1. MQTT Authentication
In the interest of brevity, the example app does not include MQTT authentication but it is a straight forward extension.  Implementing this feature would simply entail adding the MQTT Broker username and password to the [config.env](config.env) file and modifying the example app to retrieve the environment variables and pass them to the MQTT broker `connect()` method.

#### 2. Bi-directional relay
Extending the ezlo-MQTTRelay to be bi-directional (e.g. perform hub actions) is also straight-forward because the [ezlo-api](https://github.com/bblacey/ezlo-api) provides methods to run scenes and control devices.

The relay would need to subscribe to incoming messages using the MQTT `client.subscribe('Ezlo/#', cb())` and add a message handler using the `client.on('message', function())` method to forward the actions to the hub.  In additiona, an MQTT message scheme would need to be defined to represent hub actions.  

As an illustation, consider the MQTT messsage scheme below:

##### *MQTT Message Schema (illustration)*  
`Ezlo/<premises>/<hub|ALL>/<action>/<id>/<arguments>`

The following MQTT (RunScene and SetItem) messages would map to the `ezlo-api` as follows:

###### *Run a scene*
`Ezlo/Home/90000369/RunScene/5f95b647129ded1ec6e2ed23` => `hub[90000369].runScene(5f95b647129ded1ec6e2ed23)`

###### *Turn off a device*
`Ezlo/Home/90000369/SetItem/5fd39c49129ded1201c7e122/false` => `hub[90000369].setItem(5fd39c49129ded1201c7e122, false)`

###### *Dim a light to 50%*
`Ezlo/Home/90000369/SetItem/5fd39c49129ded1201c7e123/false` => `hub[90000369].setItem(5fd39c49129ded1201c7e123, 50)`

I will happily accept GitHub [pull requests](https://docs.github.com/en/free-pro-team@latest/desktop/contributing-and-collaborating-using-github-desktop/creating-an-issue-or-pull-request) that extend **ezlo-MQTTRelay** in this direction.