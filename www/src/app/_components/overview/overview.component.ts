import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { SpacesService } from 'src/app/_services/spaces.service';
import { CardService } from 'src/app/_services/card.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, AfterViewInit {

  slidesStore = [];

  spacesMap = new Map();

  space;

  chances = [];
  community_chests = [];

  constructor(
    public spacesService: SpacesService,
    public router: Router,
    private cardService: CardService
  ) { }


  ngOnInit(): void {
    this.cardService.getChances().then((chances) => {
      this.chances = chances.map(chance => this.cardService.computeText(chance));
    });
    this.cardService.getCommunityChests().then((community_chests) => {
      this.community_chests = community_chests.map(community_chest => this.cardService.computeText(community_chest));
    });
    this.spacesService.getSpaces().then((spaces) => {
      this.spacesMap = new Map();
      for (const space of spaces) {
        this.spacesMap.set(space.spaceId, space);
      }
      this.slidesStore = spaces.map(space => {
        return {
          id: space.spaceId,
          src: `assets/blocks/block_${space.image}`,
          alt: space.title,
          title: space.title,
          players: []
        };
      });
      if (spaces.length > 0) {
        this.refreshBlockDetail(this.slidesStore[0].id);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.slidesStore.length > 0) {
      this.refreshBlockDetail(this.slidesStore[0].id);
    }
  }

  refreshBlockDetail(blockId: number) {
    const space = this.spacesMap.get(blockId);
    if (space === undefined) {
      console.error('Unable to get the space with id', blockId);
    }
    this.space = space;
  }

}
