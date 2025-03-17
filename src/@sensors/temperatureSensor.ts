import type { ExampleHomebridgePlatform } from '../platform';
import type { PlatformAccessory, Service } from 'homebridge';

export class TemperatureSensor {
  private service: Service;

  constructor(
        private readonly platform: ExampleHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
  ) {
        accessory.getService(platform.Service.AccessoryInformation)!
          .setCharacteristic(platform.Characteristic.Manufacturer, 'Tech-Sterowniki')
          .setCharacteristic(platform.Characteristic.Model, 'Defro')
          .setCharacteristic(platform.Characteristic.SerialNumber, accessory.context.device.id.toString());

        this.service = accessory.getService(platform.Service.TemperatureSensor)
            || accessory.addService(platform.Service.TemperatureSensor);

        this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.name);

        setInterval(() => {
          const accessoryData = platform.getDataById(accessory.context.device.uuid);
          const accessoryValue = accessoryData.value / 10;

          this.service.updateCharacteristic(
            platform.Characteristic.CurrentTemperature,
            accessoryValue,
          );
        }, 10000);
  }
}