import { Injectable } from '@angular/core';
import { Bite, ChartBite, ComparisonChartBite, TimeseriesChartBite } from 'hxl-preview-ng-lib';
import { RecipeService } from './recipe.service';
import { Logger } from 'angular2-logger/core';
import { CookBookService } from 'hxl-preview-ng-lib';
import { PersistService } from './persist.service';
import { AppConfigService } from '../../shared/app-config.service';
import { BiteLogicFactory } from 'hxl-preview-ng-lib';
import { DomEventsService } from '../../shared/dom-events.service';
import { SimpleDropdownItem } from '../../common/component/simple-dropdown/simple-dropdown.component';
import { PersisUtil } from './persist/persist-util';
import { Observable } from 'rxjs/Observable';
import { environment } from '../../../environments/environment';
import { AsyncSubject } from 'rxjs/AsyncSubject';

@Injectable()
export class BiteService {
  public quickChartsTitle = 'Quick Charts';
  public url: string;
  private nextId = 0;

  private persistUtil: PersisUtil;

  private static findBiteInArray(bite: Bite, bites: Bite[]): number {
    let index = -1;
    for (let i = 0; i < bites.length; i++) {
      if (bite === bites[i]) {
        index = i;
      }
    }
    return index;
  }

  constructor(private recipeService: RecipeService, private cookBookService: CookBookService,
              private logger: Logger, private persistService: PersistService,
              private appConfigService: AppConfigService, private domEventService: DomEventsService) {
    this.persistUtil = new PersisUtil(logger);
  }

  public init() {
    this.url = this.appConfigService.get('url');
    const title = this.appConfigService.get('embeddedTitle');
    if (title) {
      this.quickChartsTitle = title;
    }
  }

  public getNextId(): number {
    this.nextId = this.nextId + 1;
    return this.nextId;
  }

  private loadBites(): Observable<Bite[]> {
    const embeddedConfig = this.appConfigService.get('embeddedConfig');
    if (embeddedConfig && embeddedConfig.length) {
      return Observable.of(this.persistUtil.configToBitelist(embeddedConfig));
    } else {
      return this.persistService.load();
    }
  }

  getBites(): Observable<Bite> {
    return this.loadBites()
      .flatMap(
        (bites: Bite[]) => {
          this.logger.log('Loaded bites are: ' + JSON.stringify(bites));
          return this.recipeService.processAll(bites, this.url);
        }
      );
  }

  saveBites(biteList: Bite[]): Observable<boolean> {
    const modifiedBiteList = this.unpopulateListOfBites(biteList);
    return this.persistService.save(modifiedBiteList);
  }

  private filterPathWithoutParams(path: string): string {
    if (path) {
      const index = path.indexOf(';');
      return path.slice(0, index);
    }
    return '';
  }

  saveAsImage(biteList: Bite[], isSingleWidgetMode?: boolean ) {
    const snapService = environment.snapService;
    const url = this.exportBitesToURL(biteList, isSingleWidgetMode);
    const urlEncoded = encodeURIComponent(url);
    const viewPortWidth = isSingleWidgetMode ? 500 : 1280;
    const pngDownloadUrl = `${snapService}/png?viewport={"width": ${viewPortWidth}, "height": 1}&url=${urlEncoded}`;

    setTimeout(() => {
      window.open(pngDownloadUrl, '_blank');
    }, 2);
  }

  exportBitesToURL(biteList: Bite[], isSingleWidgetMode?: boolean): string {
    biteList = biteList ? biteList : [];

    const protocol = this.appConfigService.get('loc_protocol');
    const hostname = this.appConfigService.get('loc_hostname');
    let port = this.appConfigService.get('loc_port');
    const path = this.appConfigService.get('loc_pathname');

    const modifiedBiteList = this.unpopulateListOfBites(biteList);
    let embeddedConfig = encodeURIComponent(this.persistUtil.bitelistToConfig(modifiedBiteList));

    /* Dealing with parenthesis which are not encoded by encodeURIComponent */
    embeddedConfig = embeddedConfig.replace(/\(/g, '%28').replace(/\)/g, '%29');

    const url = encodeURIComponent(this.appConfigService.get('url'));
    const pathWithoutParams = this.filterPathWithoutParams(path);

    const singleWidgetMode = isSingleWidgetMode ? ';singleWidgetMode=true' : '';

    port = port ? ':' + port : '';

    const embeddedSource = encodeURIComponent(this.appConfigService.get('embeddedSource'));
    const embeddedUrl = encodeURIComponent(this.appConfigService.get('embeddedUrl'));
    const embeddedDate = encodeURIComponent(this.appConfigService.get('embeddedDate'));
    const embeddedTitle = this.quickChartsTitle;

    return `${protocol}//${hostname}${port}${pathWithoutParams};` +
           `url=${url};embeddedSource=${embeddedSource};embeddedUrl=${embeddedUrl};embeddedDate=${embeddedDate};` +
           `embeddedConfig=${embeddedConfig}${singleWidgetMode};embeddedTitle=${embeddedTitle}`;
  }

  /**
   *
   * @param biteList
   * @return {Bite[]} A new list with cloned object. The fields that were populated from the source data will be emptied.
   */
  private unpopulateListOfBites(biteList: Bite[]): Bite[] {

    /* Do not modify the original bites by cloning them */
    const modifiedBiteList: Bite[] = this.cloneObjectLiteral(biteList) as Bite[];
    modifiedBiteList.forEach(bite => BiteLogicFactory.createBiteLogic(bite).unpopulateBite());
    return modifiedBiteList;
  }

  private cloneObjectLiteral(obj: {}): {} {
    /* Hack to clone an object */
    return JSON.parse(JSON.stringify(obj));
  }

  generateAvailableBites(): Observable<Bite> {
    console.log('Recipe url is:' + this.appConfigService.get('recipeUrl'));
    return this.cookBookService.load(this.url, this.appConfigService.get('recipeUrl'));
  }

  initBite(bite: Bite): Observable<Bite> {
    return this.recipeService.myProcessBite(bite, this.url);
  }

  resetBites() {
    this.domEventService.sendCancelledEvent();
  }

  resetBite(bite: Bite): Bite {
    return this.recipeService.resetBite(bite);
  }

  addBite(bite: Bite, bites: Bite[], availableBites: Bite[], replaceIndex?: number): Observable<boolean> {

    // /* Removing bite from list of available bites */
    // const index = BiteService.findBiteInArray(bite, availableBites);
    // availableBites.splice(index, 1);
    const observable = new AsyncSubject<boolean>();

    const clonedBite = this.cloneObjectLiteral(bite) as Bite;

    this.initBite(clonedBite)
      .subscribe(
        b => {
          if (!b.init || b.type === ChartBite.type() || bite.type === ComparisonChartBite.type() || b.type === TimeseriesChartBite.type()) {
            const cb: ChartBite = <ChartBite> b;
            // should we check if bite can render?
            if (replaceIndex === undefined) {
              // check if bite can render
              if (!cb.init || cb.values === null || cb.values.length < 3) {
                observable.next(false);
                observable.complete();
                return;
              }
            }
          }

          if (replaceIndex == null) {
            bites.push(b);
          } else {
            bites[replaceIndex] = b;
          }
          observable.next(true);
          observable.complete();
        },
        err => {
          this.logger.error('Can\'t process bite due to:' + err);
          // availableBites.push(bite);
          observable.next(false);
          observable.complete();
        }
      );
    return observable;
  }

  /**
   *
   * @param oldBite bite to be removed from bites list and added to availableBites
   * @param newBite bite to be added to bites list and removed from availableBites
   * @param bites
   * @param availableBites
   */
  switchBites(oldBite: Bite, newBite: Bite, bites: Bite[], availableBites: Bite[]) {
    if (bites) {
      const index: number = BiteService.findBiteInArray(oldBite, bites);
      if (index >= 0) {
        // BiteLogicFactory.createBiteLogic(oldBite).unpopulateBite();
        // availableBites.push(oldBite);
        this.addBite(newBite, bites, availableBites, index);
      }
    }
  }

  generateBiteSelectionMenu(availableBites: Bite[]): SimpleDropdownItem[] {
    const categoryListMap: {[key: string]: SimpleDropdownItem[]} = {};
    if (availableBites) {
      for (let i = 0; i < availableBites.length; i++) {
        const b = availableBites[i];
        const biteLogic = BiteLogicFactory.createBiteLogic(b);

        let categoryList: SimpleDropdownItem[] = categoryListMap[b.displayCategory];
        /* Initializing category list */
        if (!categoryList) {
          categoryList = [
            {
              displayValue: b.displayCategory,
              type: 'header',
              payload: null
            }
          ];
          categoryListMap[b.displayCategory] = categoryList;
        }
        categoryList.push({
          displayValue: biteLogic.title,
          type: 'menuitem',
          payload: b
        });
      }

      /* Add dividers */
      for (const key in categoryListMap) {
        if (categoryListMap.hasOwnProperty(key)) {
          const categoryList = categoryListMap[key];
          categoryList.push({
            displayValue: null,
            type: 'divider',
            payload: null
          });
        }
      }

    }

    /* Concatenate all menu items into one list */
    let result: SimpleDropdownItem[] = [];
    for (const key in categoryListMap) {
      if (categoryListMap.hasOwnProperty(key)) {
        result = result.concat(categoryListMap[key]);
      }
    }

    /* No need for separator at the end */
    result.pop();

    return result;
  }

  getPoweredByDisplay(): Boolean {
    const embeddedConfig = this.appConfigService.get('embeddedConfig');
    if (embeddedConfig && embeddedConfig.length) {
      return true;
    } else {
      return false;
    }
  }

  getPoweredBySource(): String {
    return decodeURIComponent(this.appConfigService.get('embeddedSource'));
  }
  getPoweredByUrl(): String {
    return this.appConfigService.get('embeddedUrl');
  }
  getPoweredByDate(): String {
    return decodeURIComponent(this.appConfigService.get('embeddedDate'));
  }
}
