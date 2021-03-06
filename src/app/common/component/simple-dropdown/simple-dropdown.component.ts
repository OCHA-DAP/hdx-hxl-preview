import { Component, Input, Output, OnInit, EventEmitter } from '@angular/core';

export interface SimpleDropdownPayload {
  name: string;
  checked?: boolean;
}
export interface SimpleDropdownItem {
  displayValue: string;
  type: string; // header, menuitem, divider
  payload: any;
}

@Component({
  selector: 'hxl-simple-dropdown',
  templateUrl: './simple-dropdown.component.html',
  styleUrls: ['./simple-dropdown.component.less']
})
export class SimpleDropdownComponent implements OnInit {

  @Output()
  selected: EventEmitter<any>;

  @Input()
  items: SimpleDropdownItem[];

  @Input()
  buttonText: string;

  @Input()
  linkText: string;

  @Input()
  glyphiconClass: string;

  @Input()
  makeGray = false;

  @Input()
  classDecorator: Function;
  @Input()
  classDecoratorParam: any;


  constructor() {
    this.selected = new EventEmitter<any>();
  }

  ngOnInit() {
  }

  itemSelected(payload: SimpleDropdownPayload) {
    this.selected.emit(payload);
    return false;
  }

  itemToggled(payload: SimpleDropdownPayload, checked: boolean) {
    payload.checked = checked;
    this.selected.emit(payload);
    return false;
  }

  truncate(value: string): string {
    const maxLength = 40;
    return value.slice(0, maxLength) + (value.length > maxLength ? '...' : '');
  }

  renderClass(sd: SimpleDropdownItem) {
    if (this.classDecorator) {
      return this.classDecorator(sd.payload, this.classDecoratorParam);
    }
    return '';
  }

}
