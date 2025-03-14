<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

# Homebridge Defro heatpump integration

</span>


---

This is a plugin which integrates defro DHP Premium heatpump (or basically anything which uses Tech ST-5306 driver). It uses REST API communication with emodul.eu. Pooling set as a default: 1minute. Multiple languages available - as many as tech rest api offers. This plugin adds roughly >60 accessories. Not all of them might be needed for you so you're free to remove some of them from your dashboard after installation.

![Defro ST-5306](https://github.com/tofilskimateusz/homebridge-defro/blob/main/images/defro_screen_1.png?raw=true)

#### This is how it looks like in Homebridge
![Homebridge defro screen](https://github.com/tofilskimateusz/homebridge-defro/blob/main/images/homebridge_defro_screen_1.png?raw=true)

> [!IMPORTANT]
> As we all know the majority of Tech drivers have problems with network outages from time to time. If you notice some values are out of sync - it's a problem with driver itself (or connection issue between your local ST-5306 and internet) 

### How it works
In general the plugin re-authenticate every 30min to keep session active. Every single 1 minute there's a call triggered to get most recent data. Accessories which are created are divided into 2 separate groups:
1. Sensors - only indicate if something is working or what's the temperature on specific sensor.
   - ContactSensor - to show true/false values
   - ContactSensor + condition - same as above but since it's not possible to show specific values on accessories, it's used to show status under a condition, like for example: Fan rate - we can't show exact number but we can show that it's currently working (as long as condition is met -> in this case RPM > 0)
   - TemperatureSensor - self describing
2. Controls - allows to interact with a device
   - Switch - simple on/off switch for everything which can be manually enabled/disabled
   - Switch (multi) - this is a group of switches for a single element, for example: Type of central heating temperature - this can be either static value, schedule or heating curve. This plugin will create 3 simple switches for that one to allow setting all the options.
   - Thermostat - used for cooling, central heating and utility water heating, please read more about it below

### More about thermostats
What is important is that an utility water thermostat ignores target temperature setting. This is because homekit has a limit of max value for temperature which is 38celcius. For utility water it's too low so to avoid messing up with heating pump -> we ignore target temperature. It's still very useful though to enable/disable utility water heating to a certain value set directly on a driver (based on schedule or static value). It can still be very usefull to work alongside with PV plugins to set the mode to "static" when there's high energy production. 

Another important thing is that thermostat accessory in general is not 1:1 compatibile with what we have in Defro heating pump configuration / or ST-5306 driver to be more precise. Please keep in mind this:

* For Central heating:
####
* Changes mode by changing type of Central heating temperature set
* 0 (Off) -> defaultCentralHeatingMode config setting
* 1 (Heat) -> static temperature
* 2 (Cool) -> defaultCentralHeatingMode config setting
* 3 (AUTO) -> defaultCentralHeatingMode config setting
###
* For Utility water heating:
####
* Changes mode by changing type of CO temperature set
* 0 (Off) -> defaultUtilityWaterHeatingMode config setting
* 1 (Heat) -> static temperature
* 2 (Cool) -> defaultUtilityWaterHeatingMode config setting
* 3 (AUTO) -> defaultUtilityWaterHeatingMode config setting

So in general if you change the mode to heat it will force heating (of course if your selected target temperature is higher than current temperature)

### Install

```shell
sudo npm install -g homebridge-defro
```

### Sample configuration
```
{
...
    "platforms": [
        {
            "name": "homebridge-defro",
            "platform": "HomebridgeDefro",
            "apiUrl": "https://emodul.eu/api/v1/",
            "login": "###USER_LOGIN###",
            "password": "###USER_PASSWORD###",
            "language": "en",
            "defaultCentralHeatingMode": 2,
            "defaultUtilityWaterHeatingMode": 1,
            "_bridge": {
                "username": "0E:34:1D:26:DB:34",
                "port": 38779
            }
        }
    ]
}
```