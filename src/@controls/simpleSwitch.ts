import type { ExampleHomebridgePlatform } from '../platform';
import type { PlatformAccessory, Service, CharacteristicValue } from 'homebridge';
import { AxiosResponse } from 'axios';

export class SimpleSwitch {
  private service: Service;

  constructor(
        private readonly platform: ExampleHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
  ) {
        accessory.getService(platform.Service.AccessoryInformation)!
          .setCharacteristic(platform.Characteristic.Manufacturer, 'Tech-Sterowniki')
          .setCharacteristic(platform.Characteristic.Model, 'Defro')
          .setCharacteristic(platform.Characteristic.SerialNumber, accessory.context.device.id.toString());

        this.service = accessory.getService(platform.Service.Switch)
            || accessory.addService(platform.Service.Switch);

        this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.name);
        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleSet.bind(this));

        setInterval(() => {
          const apiData = this.platform.getDataById(accessory.context.device.originalUuid);

          if (apiData.value > 0) {
            this.service.updateCharacteristic(
              platform.Characteristic.On,
              1,
            );
          } else {
            this.service.updateCharacteristic(
              platform.Characteristic.On,
              0,
            );
          }
        }, 10000);
  }

  handleSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered Set Switch, value: ' + value);

    const data = {
      'value': value,
    };

    this.platform.axiosInstance.post(
      `users/${this.platform.userId}/modules/${this.platform.moduleId}/menu/MU/ido/${this.accessory.context.device.id}`,
      data,
    ).then(() => {
      this.platform.log.info('Successfully set value to: ' + value);
    }).catch((error: AxiosResponse) => {
      this.platform.log.info('Setting value error: ' + error);
      this.platform.log.debug(error.request);
      this.platform.log.debug(error.request.body);
    });
  }
}