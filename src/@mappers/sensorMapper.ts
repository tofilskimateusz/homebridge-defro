import type { PlatformAccessory } from 'homebridge';
import type { ExampleHomebridgePlatform } from '../platform';
import { RegularSensor } from '../@sensors/regularSensor.js';
import { TemperatureSensor } from '../@sensors/temperatureSensor.js';
import { ConditionSensor } from '../@sensors/conditionSensor.js';

export class SensorMapper {

  constructor(
        private readonly platform: ExampleHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
  ) {
  }
  map() {
    const elementName = this.accessory.context.device.name;
    const elementId = this.accessory.context.device.id;

    switch (elementId) {
    case 1720: //Styk dodatkowy
    case 1719: //Pompa obiegowa 2
    case 1718: //Pompa obiegowa 1
    case 1483: //Grzałka przepływowa
    case 1482: //Grzałka CWU
    case 1480: //Grzałka CO
    case 1479: //Grzałka tacy ociekowej
    case 1478: //Zawór rewersyjny
    case 1477: //Zawór trójdrogowy
    case 1237: //Grzałka krateru
    case 1236: //Sprężarka
    case 1235: //Ragulator 2
    case 1234: //Regulator 1
    case 1233: //Styk kontroli faz (NO/NC)
    case 1232: //Styk cz. propanu (NO/NC)
    case 1231: //Styk blokady wentylatora
    case 1227: //Presostat wyskiego ciśnienia
    case 1226: //Presostat niskiego ciśnienia
      new RegularSensor(
        this.platform,
        this.accessory,
      );
      break;
    case 1186: //Delta aktywacji rozmrażania
    case 1242: //Temperatura ssania
    case 1243: //Temperatura gorącego gazu
    case 1244: //Otwarcie zaworu
    case 1246: //Niskie ciśnienie
    case 1484: //Temperatura odparowania
    case 1537: //Przegrzanie
    case 1575: //Przechłodzenie
    case 1691: //Czujnik pogodowy
    case 1716: //Czujnik zaworu
    case 1717: //Zawór mieszający
    case 12000: //Temp. górna CO
    case 12001: //Temp. dolna CO
    case 12002: //Temperatura C.W.U.
    case 12003: //Temperatura zewnętrzna
    case 12004: //Temp. parownika
    case 12006: //Wysokie ciśnienie
    case 12007: //Temperatura skraplania
    case 12008: //Temp. dochłodz. cieczy
    case 12009: //Temperatura zasilania
    case 12010: //Temperatura powrotu
    case 12011: //Temp. przepływomierza
    case 12012: //Temp. krateru sprężarki
      new TemperatureSensor(
        this.platform,
        this.accessory,
      );
      break;
    case 1240: //Pompa PWM
    case 1241: //Wentylator
    case 12013: //Przepływ
      //todo how to show those values? Currently only sensor if something is happening
      new ConditionSensor(
        this.platform,
        this.accessory,
      );
      break;
    case 1584: //Moc grzewcza
    case 1644: //Moc chłodnicza
    case 1645: //Moc elektryczna
      //todo how to show those values?
      // console.log('[' + this.accessory.context.device.id + ']' + 'Create single sensor2 accessory for: ' + elementName);
      break;
    default:
      this.platform.log.info('[' + elementId + ']' + 'Ignoring: ' + elementName);
    }
  };
}

export default class sensorMapper {
}