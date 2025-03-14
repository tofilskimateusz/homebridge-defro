import type { PlatformAccessory, Service, CharacteristicValue } from 'homebridge';

import type { ExampleHomebridgePlatform } from '../platform';
import { AxiosError } from 'axios';

export class Thermostat {
  private service: Service;
  private centralHeatingAccessoryId: number;
  private centralCoolingAccessoryId: number;
  private utilityWaterHeatingAccessoryId: number;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly currentTemperatureAccessoryId: number,
    private readonly heatingStatusAccessoryId: number,
    private readonly tempTypeAccessoryId: number,
    private readonly defaultHeatingTypeValue: number,
    private readonly ignoreHeatingTemperatureModification: boolean,
  ) {
    //todo remove that line
    this.platform.log.debug('Default heating mode: ' + defaultHeatingTypeValue);
    this.currentTemperatureAccessoryId = currentTemperatureAccessoryId;
    this.heatingStatusAccessoryId = heatingStatusAccessoryId;
    this.tempTypeAccessoryId = tempTypeAccessoryId;
    this.defaultHeatingTypeValue = defaultHeatingTypeValue;
    this.ignoreHeatingTemperatureModification = ignoreHeatingTemperatureModification;

    this.centralHeatingAccessoryId = 1003;
    this.centralCoolingAccessoryId = 1352;
    this.utilityWaterHeatingAccessoryId = 1100;
    
    
    accessory.getService(platform.Service.AccessoryInformation)!
      .setCharacteristic(platform.Characteristic.Manufacturer, 'Tech-Sterowniki')
      .setCharacteristic(platform.Characteristic.Model, 'Defro')
      .setCharacteristic(platform.Characteristic.SerialNumber, accessory.context.device.id.toString());
    
    this.service = accessory.getService(platform.Service.Thermostat) || accessory.addService(platform.Service.Thermostat);
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.name);
    this.service.getCharacteristic(platform.Characteristic.TargetHeatingCoolingState)
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

    /**
     * For Utility Water heating we ignore this action because of possible exceeding
     * maximum temperature of 38
     */
    if (!this.ignoreHeatingTemperatureModification) {
      this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
        .onSet(this.handleTargetTemperatureSet.bind(this));
    }
    
    setInterval(() => {
      this.service.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature,
        this.getCurrentTemperature(),
      );
      this.service.updateCharacteristic(
        this.platform.Characteristic.CurrentHeatingCoolingState,
        this.getCurrentHeatingCoolingState(),
      );
      this.service.updateCharacteristic(
        this.platform.Characteristic.TargetHeatingCoolingState,
        this.getTargetHeatingCoolingState(),
      );

      this.service.updateCharacteristic(
        this.platform.Characteristic.TargetTemperature,
        this.getTargetTemperature(accessory),
      );

    }, 10000);

    
  }
  
  getCurrentHeatingCoolingState() {
    const tempTypeAccessoryData = this.platform.getDataByElementId(this.tempTypeAccessoryId, 'c');
    
    switch (this.tempTypeAccessoryId) {
    case this.centralHeatingAccessoryId:
      if (tempTypeAccessoryData.value === 0 && this.metHeatingCoolingCondition()) {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      }
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    case this.centralCoolingAccessoryId:
      if (tempTypeAccessoryData.value === 0 && this.metCoolingCondition()) {
        return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
      }
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    case this.utilityWaterHeatingAccessoryId:
      if (tempTypeAccessoryData.value === 0 && this.metHeatingUtilityWaterCondition()) {
        return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
      }
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    default:
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }
  }
  
  getTargetHeatingCoolingState() {
    const tempTypeAccessoryData = this.platform.getDataByElementId(this.tempTypeAccessoryId, 'c');
    
    switch (this.tempTypeAccessoryId) {
    case this.centralHeatingAccessoryId:
      if (tempTypeAccessoryData.value === 0 && this.metHeatingCoolingCondition()) {
        return this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
      }
      return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    case this.centralCoolingAccessoryId:
      if (tempTypeAccessoryData.value === 0 && this.metCoolingCondition()) {
        return this.platform.Characteristic.TargetHeatingCoolingState.COOL;
      }
      return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    case this.utilityWaterHeatingAccessoryId:
      if (tempTypeAccessoryData.value === 0 && this.metHeatingUtilityWaterCondition()) {
        return this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
      }
      return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    default:
      return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    }
  }
  
  getCurrentTemperature() {
    const currentTemperatureAccessoryData = this.platform.getDataByElementId(this.currentTemperatureAccessoryId, 's');
    return currentTemperatureAccessoryData.value / 10;
  }

  getTargetTemperature(accessory: PlatformAccessory) {
    const accessoryData = this.platform.getDataById(accessory.context.device.originalUuid);

    /**
     * Just because in Thermostat accessory we can't exceed 38 celcius
     */
    if (accessoryData.value > 38) {
      return 38;
    }
    return accessoryData.value;
  }
  
  handleTargetHeatingCoolingStateSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered Set Thermostat, value: ' + value);
    let paramValue = this.defaultHeatingTypeValue;

    if (value === 1) {
      paramValue = 0;
    }

    this.platform.axiosInstance.post(
      `users/${this.platform.userId}/modules/${this.platform.moduleId}/menu/MU/ido/${this.tempTypeAccessoryId}`,
      {
        'value': paramValue,
      },
    ).then(() => {
      this.platform.log.info('Successfully set value to: ' + paramValue);
    }).catch((error: AxiosError) => {
      this.platform.log.info('Setting value error: ' + error);
      this.platform.log.debug(error.request);
      this.platform.log.debug(error.request.body);
    });
  }

  handleTargetTemperatureSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered Set Thermostat, value: ' + value);

    this.platform.axiosInstance.post(
      `users/${this.platform.userId}/modules/${this.platform.moduleId}/menu/MU/ido/${this.accessory.context.device.id}`,
      {
        'value': value,
      },
    ).then(() => {
      this.platform.log.info('Successfully set value to: ' + value);
    }).catch((error: AxiosError) => {
      this.platform.log.info('Setting value error: ' + error);
      this.platform.log.debug(error.request);
      this.platform.log.debug(error.request.body);
    });
  }

  metHeatingCoolingCondition(): boolean {
    const workingStatus = this.platform.getDataByElementId(1000, 'c').value;
    const heatingStatus = this.platform.getDataByElementId(this.heatingStatusAccessoryId, 's').value;

    return workingStatus !== 2 && workingStatus !== 4 && workingStatus !== 5 && heatingStatus > 0;
  }

  metCoolingCondition(): boolean {
    const workingStatus = this.platform.getDataByElementId(1000, 'c').value;
    const coolingStatus = this.platform.getDataByElementId(this.heatingStatusAccessoryId, 's').value;

    return workingStatus !== 1 && workingStatus !== 2 && workingStatus !== 3 && coolingStatus > 0;
  }

  metHeatingUtilityWaterCondition(): boolean {
    const workingStatus = this.platform.getDataByElementId(1000, 'c').value;
    const heatingStatus = this.platform.getDataByElementId(this.heatingStatusAccessoryId, 's').value;

    return workingStatus !== 1 && workingStatus !== 4 && heatingStatus > 0;
  }
}
