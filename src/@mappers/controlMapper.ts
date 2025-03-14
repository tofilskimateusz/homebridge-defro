import type { PlatformAccessory } from 'homebridge';
import type { ExampleHomebridgePlatform } from '../platform';
import { SimpleSwitch } from '../@controls/simpleSwitch.js';
import { Thermostat } from '../@controls/thermostat.js';
import { MultiSwitch } from '../@controls/multiSwitch.js';

export class ControlMapper {

  constructor(
        private readonly platform: ExampleHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
  ) {
  }
  map() {
    const elementName = this.accessory.context.device.name;
    const elementId = this.accessory.context.device.id;

    switch (elementId) {
    case 1000: //Tryb pracy
    case 1003: //Tryb temp. zadanej CO
    case 1100: //Tryb temp. zadanej CWU
    case 1352: //Ustawienia chłodzenia
      new MultiSwitch(
        this.platform,
        this.accessory,
      );
      break;
    case 1004: //Temp. zadana CO
    case 1101: //Temp. zadana CWU
    case 1353: //Temp. zadana chłodzenia
      if (elementId === 1004) {
        new Thermostat(
          this.platform,
          this.accessory,
          12000, //top CO Temp.
          1240, //Pompa PWM
          1003, //CO temp. type,
          this.platform.config.defaultCentralHeatingMode,
          false, //Do not ignore heating temp. change
        );
      } else if (elementId === 1101) {
        new Thermostat(
          this.platform,
          this.accessory,
          12002, //CWU current temp.
          1240, //Pompa PWM
          1100, //CWU temp. type,
          this.platform.config.defaultUtilityWaterHeatingMode,
          true, //Ignore heating temp. change
        );
      } else {
        new Thermostat(
          this.platform,
          this.accessory,
          12000, //top CO Temp.
          1240, //Pompa PWM
          1352, //Cooling temp. type,
          1, //Schedule
          false, //Do not ignore heating temp. change
        );
      }
      break;

    case 1099: //PriorytetCWU
      new SimpleSwitch(
        this.platform,
        this.accessory,
      );
      break;

    case 1091: //Krzywa
    case 1095: //Czas pomiaru temp. zewn. - cz. pogodowy
    case 1096: //Histereza CO
    case 1097: //Max. temperatura zewnętrzna
    case 1103: //Histereza CWU
    case 1461: //Min. temperatura zewnętrzna
    case 1093: //Temperatura min.
    case 1094: //Temperatura max.
      //todo move to configuration
      //todo disabled from platform.ts 
      break;

    default:
      this.platform.log.info('[' + elementId + ']' + 'Ignoring: ' + elementName);
    }
  };
}