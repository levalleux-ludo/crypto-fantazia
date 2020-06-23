import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { WelcomeComponent } from './_components/welcome/welcome.component';
import { GameComponent } from './_components/game/game.component';
import { OverviewComponent } from './_components/overview/overview.component';


const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'game', component: GameComponent },
  { path: 'overview', component: OverviewComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
