import { Component, OnInit } from '@angular/core';
import { ConnectionService } from 'src/app/_services/connection.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(
    public connectionService: ConnectionService
  ) { }

  ngOnInit(): void {
  }

}
