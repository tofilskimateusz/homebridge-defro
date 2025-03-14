import type { ExampleHomebridgePlatform } from '../platform';
import type { PlatformAccessory, Service } from 'homebridge';

export class ConditionSensor {
  private service: Service;

  constructor(
        private readonly platform: ExampleHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
  ) {
        accessory.getService(platform.Service.AccessoryInformation)!
          .setCharacteristic(platform.Characteristic.Manufacturer, 'Tech-Sterowniki')
          .setCharacteristic(platform.Characteristic.Model, 'Defro')
          .setCharacteristic(platform.Characteristic.SerialNumber, accessory.context.device.id.toString());

        this.service = accessory.getService(platform.Service.ContactSensor)
            || accessory.addService(platform.Service.ContactSensor);

        this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.name);

        setInterval(() => {
          const accessoryData = platform.getDataById(accessory.context.device.uuid);

          if (accessoryData.value > 0) {
            this.service.updateCharacteristic(
              platform.Characteristic.ContactSensorState,
              platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
            );
          } else {
            this.service.updateCharacteristic(
              platform.Characteristic.ContactSensorState,
              platform.Characteristic.ContactSensorState.CONTACT_DETECTED,
            );
          }
        }, 10000);
  }
}