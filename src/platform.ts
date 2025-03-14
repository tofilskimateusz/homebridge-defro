/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unused-vars */
import type { HomebridgeConfig, API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthenticationResponse } from './@dto/authentication.response';
import { SensorMapper } from './@mappers/sensorMapper.js';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ControlMapper } from './@mappers/controlMapper.js';

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];
  public axiosInstance: AxiosInstance;
  public userId: number|null = null;
  public moduleId: string|null = null;

  private accessToken: string|null = null;
  private apiData: {[key: string]: any } = [];
  private translations: {[key: string]: any} = [];

  private allowedSensorIds: number[] = [
    1720, //Styk dodatkowy
    1719, //Pompa obiegowa 2
    1718, //Pompa obiegowa 1
    1483, //Grzałka przepływowa
    1482, //Grzałka CWU
    1480, //Grzałka CO
    1479, //Grzałka tacy ociekowej
    1478, //Zawór rewersyjny
    1477, //Zawór trójdrogowy
    1237, //Grzałka krateru
    1236, //Sprężarka
    1235, //Ragulator 2
    1234, //Regulator 1
    1233, //Styk kontroli faz (NO/NC)
    1232, //Styk cz. propanu (NO/NC)
    1231, //Styk blokady wentylatora
    1227, //Presostat wyskiego ciśnienia
    1226, //Presostat niskiego ciśnienia
    1186, //Delta aktywacji rozmrażania
    1242, //Temperatura ssania
    1243, //Temperatura gorącego gazu
    1244, //Otwarcie zaworu
    1246, //Niskie ciśnienie
    1484, //Temperatura odparowania
    1537, //Przegrzanie
    1575, //Przechłodzenie
    1691, //Czujnik pogodowy
    1716, //Czujnik zaworu
    1717, //Zawór mieszający
    12000, //Temp. górna CO
    12001, //Temp. dolna CO
    12002, //Temperatura C.W.U.
    12003, //Temperatura zewnętrzna
    12004, //Temp. parownika
    12006, //Wysokie ciśnienie
    12007, //Temperatura skraplania
    12008, //Temp. dochłodz. cieczy
    12009, //Temperatura zasilania
    12010, //Temperatura powrotu
    12011, //Temp. przepływomierza
    12012, //Temp. krateru sprężarki
    1240,//Pompa PWM
    1241, //Wentylator
    12013, //Przepływ
    1584, //Moc grzewcza
    1644, //Moc chłodnicza
    1645, //Moc elektryczna
  ];

  private allowedControlIds: number[] = [
    1000, //Tryb pracy
    1003, //Tryb temp. zadanej CO
    1100, //Tryb temp. zadanej CWU
    1352, //Ustawienia chłodzenia
    1004, //Temp. zadana CO
    1101, //Temp. zadana CWU
    1353, //Temp. zadana chłodzenia
    1099, //PriorytetCWU
  ];

  constructor(
      public readonly log: Logging,
      public readonly config: PlatformConfig,
      public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.apiData = [];
    this.translations = {};

    this.log.debug('Finished initializing platform');

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl ?? 'https://emodul.eu/api/v1/',
      timeout: 30000,
    });

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');

      this.getDefroData(true);

      setInterval(() => {
        this.getDefroData(false);
      }, 30 * 60000); //refresh login after 30min
    });
  }

  getDefroData(firstRun: boolean) {
    this.axiosInstance.post('authentication', {
      username: this.config.login,
      password: this.config.password,
    }).then((response: AxiosResponse<AuthenticationResponse>) => {
      this.log.debug('Authenticated');
      this.accessToken = response.data.token;
      this.userId = response.data.user_id;

      this.axiosInstance = axios.create({
        baseURL: this.config.apiUrl ?? 'https://emodul.eu/api/v1/',
        timeout: 30000,
        headers: { 'Authorization': `Bearer ${this.accessToken}` },
      });
    }).then(() => {
      this.axiosInstance.get('i18n/' + this.config.language).then((translationResponse: AxiosResponse) => {
        this.log.debug('Got translations');
        this.translations = translationResponse.data.data;
        this.getApiData(firstRun);

        //get data from API every 1minute
        setInterval(() => {
          this.getApiData(false);
        }, 60000);
      });
    });
  }
  
  async getApiData(isFirstRun: boolean) {
    let requestsHandled = 0;
    this.axiosInstance.get(`users/${this.userId}/modules`).then((response: AxiosResponse) => {
      for (const module of response.data) {
        this.moduleId = module.udid;

        //sensors
        this.axiosInstance.get(`users/${this.userId}/modules/${this.moduleId}`)
          .then((response: AxiosResponse) => {
            for (const element of response.data.tiles) {
              const elementName = this.getElementName(element);

              if (elementName === null || elementName.length === 0) {
                continue;
              }

              const uuid = this.api.hap.uuid.generate(`s_${element.id}_${element.parentId}`);
              let value = '';

              switch (element.type) {
              case 40:
                value = this.translations[element.params.statusId];
                break;
              case 11:
                value = element.params.workingStatus; //true/false
                break;
              case 6:
                value = element.params.widget2.value;
                break;
              default:
                this.log.debug('Non-supported type:' + element.type);
                continue;
              }

              this.apiData[uuid] = {
                name: elementName,
                value: value,
                uuid: uuid,
                id: element.id,
                parentId: element.parentId,
                options: [],
                category: 's',
              };
            }
            requestsHandled++;
          });

        //controls
        this.axiosInstance.get(`users/${this.userId}/modules/${this.moduleId}/menu/MU`)
          .then((response: AxiosResponse) => {
            for (const element of response.data.data.elements) {
              const elementName = this.getControlElementName(element);

              if (element.params.value === undefined || element.params.value.length === 0) {
                continue;
              }

              if (elementName === null || elementName.length === 0) {
                continue;
              }

              const uuid = this.api.hap.uuid.generate(`c_${element.id}_${element.parentId}`);

              const optionElements = [];

              if (element.params.options !== undefined) {
                let i = 0;
                for (const optionElement of element.params.options) {
                  optionElements[i] = {
                    name: this.translations[optionElement.txtId],
                    value: optionElement.value,
                    id: i,
                  };
                  i++;
                }
              }

              this.apiData[uuid] = {
                name: elementName,
                value: element.params.value,
                uuid: uuid,
                id: element.id,
                parentId: element.parentId,
                options: optionElements,
                category: 'c',
              };
            }
            requestsHandled++;
          });
      }
    });

    await new Promise<void>(resolve => {
      const checkRequests = setInterval(() => {
        if (requestsHandled === 2) {
          clearInterval(checkRequests);
          resolve();
          if (isFirstRun) {
            this.discoverDevices();
          }
        }
      }, 1000);
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices() {
    //sensors
    this.axiosInstance.get(`users/${this.userId}/modules/${this.moduleId}`).then((response: AxiosResponse) => {
      this.log.info('Discovering sensors...');
      for (const element of response.data.tiles) {
        if (!this.allowedSensorIds.includes(element.id)) {
          continue;
        }

        const uuid = this.api.hap.uuid.generate(`s_${element.id}_${element.parentId}`);
        const apiData = this.getDataById(uuid);

        if (apiData.name === undefined) {
          continue;
        }

        const accessoryId = apiData.id;
        const accessoryValue = apiData.value;
        const accessoryName = apiData.name;

        const accessory = this.accessories.get(uuid);
        
        this.discoverSensorAccessory(
          uuid,
          accessoryId,
          accessoryValue,
          accessoryName,
          accessory,
        );

        // push into discoveredCacheUUIDs
        this.discoveredCacheUUIDs.push(uuid);
      }
    });
    
    //controls
    this.axiosInstance.get(`users/${this.userId}/modules/${this.moduleId}/menu/MU`).then((response: AxiosResponse) => {
      this.log.info('Discovering controls...');
      for (const element of response.data.data.elements) {
        if (!this.allowedControlIds.includes(element.id)) {
          continue;
        }

        const uuid = this.api.hap.uuid.generate(`c_${element.id}_${element.parentId}`);
        const apiData = this.getDataById(uuid);
        const accessoryName = apiData.name;
        const accessoryValue = apiData.value;
        const accessoryId = apiData.id;

        if (apiData.name === undefined) {
          continue;
        }
        
        if (apiData.options.length > 0) {
          for (const optionElement of apiData.options) {
            const optionUuid = this.api.hap.uuid.generate(`c_${apiData.id}_${apiData.parentId}_${optionElement.value}`);
            const existingAccessory = this.accessories.get(optionUuid);
            const optionName = accessoryName + ': ' + optionElement.name;
            this.discoverControlAccessory(
              optionUuid,
              uuid,
              accessoryId,
              parseInt(optionElement.id),
              optionName,
              optionElement.value,
              accessoryValue,
              existingAccessory,
            );
          }
        } else {
          const accessory = this.accessories.get(uuid);
          this.discoverControlAccessory(
            uuid,
            uuid,
            accessoryId,
            accessoryId,
            accessoryName,
            accessoryValue,
            accessoryValue,
            accessory,
          );
        }

        // push into discoveredCacheUUIDs
        this.discoveredCacheUUIDs.push(uuid);
      }
    });

    // for (const [uuid, accessory] of this.accessories) {
    //   if (!this.discoveredCacheUUIDs.includes(uuid)) {
    //     this.log.info('Removing existing accessory from cache:', accessory.displayName);
    //     this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    //   }
    // }
  }

  getElementName(element: any) {
    switch (element.type) {
    case 40:
      return this.translations[element.params.headerId];
    case 11:
      return this.translations[element.params.txtId];
    case 6:
      return this.translations[element.params.widget2.txtId];
    default:
      return null;
    }
  }

  getControlElementName(element: any) {
    if (element.txtId !== 0) {
      return this.translations[element.txtId];
    }

    return null;
  }

  getDataByElementId(id: number, category: string) {
    for (const [index, item] of Object.entries(this.apiData)) {
      if (item.id === id && item.category === category) {
        return item;
      }
    }

    return {};
  }

  getDataById(id: string) {
    for (const [index, item] of Object.entries(this.apiData)) {
      if (index === id) {
        return item;
      }
    }

    return {};
  }

  discoverControlAccessory(
    uuid: string,
    originalUuid: string,
    id: number,
    optionId: number,
    name: string,
    value: any,
    originalValue: number,
    accessory?: PlatformAccessory,
  ) {
    if (accessory) {
      this.log.info('Restoring existing accessory from cache:', name);
      
      this.api.updatePlatformAccessories([accessory]);
      accessory.context.device.uuid = uuid;
      accessory.context.device.originalUuid = originalUuid;
      accessory.context.device.optionId = optionId;
      accessory.context.device.id = id;
      accessory.context.device.value = value;
      accessory.context.device.originalValue = originalValue;
      accessory.context.device.name = name;

      const controlMapper = new ControlMapper(
        this,
        accessory,
      );
      controlMapper.map();
    } else {
      this.log.info('Adding new accessory:', name);
      const newAccessory = new this.api.platformAccessory(name, uuid);
      newAccessory.context.device = {};
      newAccessory.context.device.uuid = uuid;
      newAccessory.context.device.originalUuid = originalUuid;
      newAccessory.context.device.optionId = optionId;
      newAccessory.context.device.id = id;
      newAccessory.context.device.value = value;
      newAccessory.context.device.originalValue = originalValue;
      newAccessory.context.device.name = name;
      
      const controlMapper = new ControlMapper(
        this,
        newAccessory,
      );
      controlMapper.map();

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [newAccessory]);
    }
  }

  discoverSensorAccessory(
    uuid: string,
    id: number,
    value: string,
    name: string,
    accessory?: PlatformAccessory,
  ) {
    if (accessory) {
      this.log.info('Restoring existing accessory from cache:', name);
      
      this.api.updatePlatformAccessories([accessory]);
      accessory.context.device.uuid = uuid;
      accessory.context.device.id = id;
      accessory.context.device.value = value;
      accessory.context.device.name = name;

      const sensorMapper = new SensorMapper(
        this,
        accessory,
      );
      sensorMapper.map();
    } else {
      this.log.info('Adding new accessory:', name);

      const newAccessory = new this.api.platformAccessory(name, uuid);
      newAccessory.context.device = {};
      newAccessory.context.device.uuid = uuid;
      newAccessory.context.device.id = id;
      newAccessory.context.device.value = value;
      newAccessory.context.device.name = name;

      const sensorMapper = new SensorMapper(
        this,
        newAccessory,
      );
      sensorMapper.map();

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [newAccessory]);
    }
  }
}
