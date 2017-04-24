import { Component, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import { ChartBite } from '../../types/chart-bite';
import { Input } from '@angular/core';

declare const c3: any;

@Component({
  selector: 'hxl-content-chart',
  templateUrl: './content-chart.component.html',
  styleUrls: ['./content-chart.component.less']
})
export class ContentChartComponent implements OnInit, AfterViewInit {
  @Input()
  bite: ChartBite;

  elementRef: ElementRef;
  maxNumberOfValues = 12;

  pieThreshold = 4;

  constructor(elementRef: ElementRef) {
    this.elementRef = elementRef;
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    if (this.bite.values) {
      this.render();
    }
  }

  protected overwriteXAxisLabel() {
    if (this.bite.dataTitle && this.bite.values.length > this.pieThreshold) {
      this.bite.values[0] = this.bite.dataTitle;
    }
  }

  protected generateOptions(): {} {
    this.overwriteXAxisLabel();

    const config = {
      bindto: this.elementRef.nativeElement.children[0],
      data: {},
      zoom: {},
      size: {
        height: 225
      },
      axis: {
        rotated: this.bite.swapAxis,
        x: {
          type: 'category',
          categories: this.bite.categories
        },
        y: {
          tick: {
            rotate: 30
          }
        }
      },
      grid: {
        y: {
          show: this.bite.showGrid
        }
      }
    };

    const values = this.bite.values;

    if (values.length > this.pieThreshold) {
      config.data = {
        columns: [values],
        type: 'bar'
      };
    } else {
      const pieValues = [];
      for (let i = 0; i < values.length; i++) {
        pieValues.push([this.bite.categories[i], values[i]]);
      }
      console.log(pieValues);

      config.data = {
        columns: pieValues,
        type: 'pie'
      };
    }

    if (values.length > this.maxNumberOfValues) {
      config.zoom = {
        enabled: true,
        type: 'drag', // can be [drag, scroll]
        extent: [1.5, 2]
      };
    }

    return config;
  }

  render(): void {
    const c3_chart = c3.generate(this.generateOptions());
    if (this.bite.values.length > this.maxNumberOfValues) {
      c3_chart.internal.brush.extent([0, this.maxNumberOfValues]).update();
      c3_chart.internal.redrawForBrush();
    }

  }
}
