import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../views/AppLayout.vue'
import HomeView from '../views/HomeView.vue'
import NationView from '../views/NationView.vue'
import AccountView from '../views/AccountView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  {
    path: '/login',
    component: LoginView,
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: '/home' },
      { path: 'home', component: HomeView },
      { path: 'nation', component: NationView },
      { path: 'account', component: AccountView },
      { path: 'settings', component: SettingsView },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
