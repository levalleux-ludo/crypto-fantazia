import { Component, OnInit } from '@angular/core';
import { ModalService } from 'src/app/_services/modal.service';

@Component({
  selector: 'app-modal-example',
  templateUrl: './modal-example.component.html',
  styleUrls: ['./modal-example.component.scss']
})
export class ModalExampleComponent implements OnInit {

  constructor(
    public modalService: ModalService
  ) { }

  ngOnInit(): void {
  }

}
