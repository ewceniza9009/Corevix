import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'transfers',
        loadChildren: () => import('../transfers/transfers.module').then(m => m.TransfersPageModule)
      },
      {
        path: 'cards',
        loadChildren: () => import('../cards/cards.module').then(m => m.CardsPageModule)
      },
      {
        path: 'loans',
        loadChildren: () => import('../loans/loans.module').then(m => m.LoansPageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule {}
