import { Component, OnInit, ViewChild } from '@angular/core';
import {Bite} from '../bite/types/bite';
import {SortablejsOptions} from 'angular-sortablejs';
import {BiteService} from '../shared/bite.service';
import {Logger} from 'angular2-logger/core';
import {AppConfigService} from '../../shared/app-config.service';
import { SimpleDropdownItem } from '../../common/component/simple-dropdown/simple-dropdown.component';
import { SimpleModalComponent } from '../../common/component/simple-modal/simple-modal.component';
import { Observable } from 'rxjs/Observable';
import { AsyncSubject } from 'rxjs/AsyncSubject';

@Component({
  selector: 'hxl-bite-list',
  templateUrl: './bite-list.component.html',
  styleUrls: ['./bite-list.component.less']
})
export class BiteListComponent implements OnInit {

  biteList: Array<Bite>;
  availableBites: Array<Bite>;

  listIsFull: boolean;

  hxlUnsupported: boolean;

  smartChartsMenu: SimpleDropdownItem[];

  sortableMain: SortablejsOptions = {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    forceFallback: true
  };

  @ViewChild('savedModal')
  private savedModal: SimpleModalComponent;
  private savedModalMessage: string;

  @ViewChild('embedLinkModal')
  private embedLinkModal: SimpleModalComponent;

  private embedUrl;
  private iframeUrl;

  /* Used for when only one widget is embedded in a page */
  singleWidgetMode: boolean;

  constructor(private biteService: BiteService, private appConfig: AppConfigService, private logger: Logger) {
    this.biteList = [];
    this.listIsFull = false;
    this.logger = logger;
    this.hxlUnsupported = false;

    this.smartChartsMenu = [
      {
        displayValue: 'EXPORT ALL CHARTS',
        type: 'header',
        payload: null
      },
      {
        displayValue: 'Embed',
        type: 'menuitem',
        payload: 'embed'
      }

    ];

  }

  ngOnInit() {
    this.logger.info('BiteListComponent on init');
    this.generateAvailableBites().subscribe(() => this.load());

    if (this.appConfig.get('has_modify_permission') === 'true') {
      this.smartChartsMenu.splice(0, 0,
        {
          displayValue: 'ADMIN SETTINGS',
          type: 'header',
          payload: null
        },
        {
          displayValue: 'Save the current views as default',
          type: 'menuitem',
          payload: 'save-views'
        },
        {
          displayValue: null,
          type: 'divider',
          payload: null
        }
      );
    }

    this.singleWidgetMode = this.appConfig.get('singleWidgetMode') === 'true';
  }

  private removeLoadedBiteToList(bite: Bite): void {
    this.biteList = this.biteList.filter(b => b !== bite);
    if (this.biteList.length <= +this.appConfig.get('maxBites')) {
      this.listIsFull = false;
    }
  }

  private load() {
    this.biteService.getBites().subscribe(
      (bite: Bite) => {
        this.logger.log('Processing bite ' + JSON.stringify(bite));

        this.biteList.push(bite);
        this.logger.log('biteList ' + JSON.stringify(this.biteList));
      },
      errObj => {
        this.logger.log('load>getBites>in ERROR...');
      },
      () => {
        this.logger.log('load>getBites>on COMPLETE...');

        if (this.availableBites && this.biteList && this.availableBites.length !== 0 && this.biteList.length === 0) {
          this.loadDefaultBites();
        }
      }
    );
  }

  // loads 3 bites as default when no other bites are saved
  private loadDefaultBites() {

    // splitting the bites by their type
    const listA = this.availableBites.filter(bite => bite.type === 'chart');
    const listB = this.availableBites.filter(bite => bite.type === 'key figure');
    const listC = this.availableBites.filter(bite => bite.type === 'timeseries');

    let orderedBites: Array<Bite>;
    orderedBites = [];

    if (listA && listA.length > 0) {
      orderedBites.push(listA[0]);
      listA.splice(0, 1);
    }
    if (listB && listB.length > 0) {
      orderedBites.push(listB[0]);
      listB.splice(0, 1);
    }
    if (listC && listC.length > 0) {
      orderedBites.push(listC[0]);
      listC.splice(0, 1);
    }
    orderedBites = orderedBites.concat(listA);
    orderedBites = orderedBites.concat(listB);
    orderedBites = orderedBites.concat(listC);

    // filling the slots
    this.addBite(orderedBites[0]);
    this.addBite(orderedBites[1]);
    this.addBite(orderedBites[2]);

  }

  addBite(bite: Bite) {
    this.biteService.addBite(bite, this.biteList, this.availableBites);
  }

  deleteBite(bite: Bite) {
    this.removeLoadedBiteToList(bite);
    this.availableBites.push(this.biteService.resetBite(bite));
  }

  switchBite(bitePair: { oldBite: Bite, newBite: Bite }) {
    this.biteService.switchBites(bitePair.oldBite, bitePair.newBite, this.biteList, this.availableBites);
  }

  generateAvailableBites(): Observable<boolean> {
    const observable = new AsyncSubject<boolean>();
    if (!this.availableBites) {
      this.availableBites = [];
      // const loadedHashCodeList: number[] = this.biteList ? this.biteList.map(bite => bite.hashCode) : [];
      this.biteService.generateAvailableBites()
        .subscribe(
          bite => {
            this.logger.log('Available bite ' + JSON.stringify(bite));
            this.availableBites.push(bite);
          },
          errObj => {
            this.logger.log('in ERROR...');
            observable.next(false);
            observable.complete();
          },
          () => {
            this.logger.log('on COMPLETE...');
            if (this.availableBites && this.biteList && this.availableBites.length === 0 && this.biteList.length === 0) {
              // Your files contains HXL tags which are not supported by Quick Charts
              this.hxlUnsupported = true;
            }
            observable.next(true);
            observable.complete();
          }
        );
    }
    return observable;
  }

  singleEmbedUrlCreated(event: string) {
    this.embedUrl = event;
    this.iframeUrl = this.generateIframeUrl(this.embedUrl);
    this.embedLinkModal.show();
  }

  doSaveAction(action: string) {
    // this.logger.log(action + ' - ' +
    //   this.biteService.exportBitesToURL(this.biteList));
    if (action === 'embed') {
      this.embedUrl = this.biteService.exportBitesToURL(this.biteList);
      this.iframeUrl = this.generateIframeUrl(this.embedUrl);
      this.embedLinkModal.show();
    } else if (action === 'save-views') {
      this.biteService.saveBites(this.biteList).subscribe(
        (successful: boolean) => {
          this.logger.log('Result of bites saved: ' + successful);
          this.savedModalMessage = 'Your configuration was saved on the server !';
          this.savedModal.show();
        },
        error => {
          this.logger.error('Save failed: ' + error);
          this.savedModalMessage = 'FAILED: Saving configuration failed. Please try again!';
        }
      );
    }
  }

  generateIframeUrl(src: string) {
    const result = '<iframe  src="' + src + '" style="border:none; width:100%; min-height:500px"></iframe>';
    return result;
  }
}
