import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { AnalyticsService as GenericAnalyticsService, Bite, GA_PAGEVIEW } from 'hxl-preview-ng-lib';
import { AppConfigService } from '../../shared/app-config.service';

declare const ga: any;
declare const mixpanel: any;

/**
 * Service that will try to abstract sending the analytics events
 * to Google Analytics and Mixpanel, but do nothing if the libs are
 * not loaded
 */
@Injectable()
export class AnalyticsService {
  public static TRACK_EVENT_SETTINGS_OPEN: String = 'settings-open';
  public static TRACK_EVENT_SETTINGS_CHANGE: String = 'settings-change';
  public static TRACK_EVENT_CHART_SCROLL: String = 'chart-scroll';
  private eventTrack: Map<Bite, Map<String, Boolean>>;

  public mpToken: string;
  public gaToken: string;

  constructor(private logger: Logger, private appConfig: AppConfigService, private genericAnalyticsService: GenericAnalyticsService) {
    this.eventTrack = new Map<Bite, Map<String, Boolean>>();
  }

  public init() {
    this.gaToken = this.appConfig.get('googleAnalyticsKey');
    this.mpToken = this.appConfig.thisIsProd() ?
        this.appConfig.get('prodMixpanelKey') : this.appConfig.get('testMixpanelKey');

    this.genericAnalyticsService.init(this.gaToken, this.mpToken);
  }

  /**
   * Will check if the event has been triggered already, if not then set the event as triggered and return success
   * @param {String} eventName
   * @returns {Boolean} true if the change was successful
   */
  private trackEventAllowed(bite: Bite, eventName: String): Boolean {
    let currentTrack = this.eventTrack.get(bite);
    if (!currentTrack) {
      currentTrack = new Map<String, Boolean>();
      this.eventTrack.set(bite, currentTrack);
    }

    if (!currentTrack.get(eventName)) {
      currentTrack.set(eventName, true);
      return true;
    }
    return false;
  }

  private trackBiteSwitch(oldBite: Bite, newBite: Bite) {
    this.eventTrack.delete(oldBite);
  }


  public trackView() {
    this.genericAnalyticsService.trackEventCategory('hxl preview', {'type': GA_PAGEVIEW});
  }

  public trackSave() {
    this.genericAnalyticsService.trackEventCategory('hxl preview edit');
  }

  public trackEmbed() {
    this.trackAction('action-embed');

    const data = {
      action: 'embed button click'
    };
    this.genericAnalyticsService.trackEventCategory('viz export click', data, data);
  }
  public trackSaveImage() {
    this.trackAction('action-save-image');
    const data = {
      action: 'export image click'
    };
    this.genericAnalyticsService.trackEventCategory('viz export click', data, data);
  }
  public trackSwitchBite(oldBite: Bite, newBite: Bite) {
    this.trackBiteSwitch(oldBite, newBite);
    this.trackAction('action-switch-bite');
    const data = {
      action: 'switch bite'
    };
    this.genericAnalyticsService.trackEventCategory('viz interaction', data, data);
  }
  public trackSettingsMenuOpen(bite: Bite) {
    if (this.trackEventAllowed(bite, AnalyticsService.TRACK_EVENT_SETTINGS_OPEN)) {
      this.trackAction('action-settings-menu');
      const data = {
        action: 'open settings menu'
      };
      this.genericAnalyticsService.trackEventCategory('viz interaction', data, data);
    }
  }
  public trackSettingsChanged(bite: Bite) {
    if (this.trackEventAllowed(bite, AnalyticsService.TRACK_EVENT_SETTINGS_CHANGE)) {
      this.trackAction('action-settings-changed');
      const data = {
        action: 'settings edit'
      };
      this.genericAnalyticsService.trackEventCategory('viz interaction', data, data);
    }
  }
  public trackChartScroll(bite: Bite) {
    if (this.trackEventAllowed(bite, AnalyticsService.TRACK_EVENT_CHART_SCROLL)) {
      this.trackAction('action-chart-scroll');
      const data = {
        action: 'viz scroll'
      };
      this.genericAnalyticsService.trackEventCategory('viz interaction', data, data);
    }
  }

  private trackAction(actionName: string) {
    // TODO: remove
    console.warn('Tracking: ' + actionName);
  }
}
