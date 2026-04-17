import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../views/AppLayout.vue'
import HomeView from '../views/HomeView.vue'
import NationView from '../views/NationView.vue'
import SettingsView from '../views/SettingsView.vue'
import AccountView from '../views/AccountView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          redirect: '/home'
        },
        {
          path: 'home',
          name: 'home',
          component: HomeView
        },
        {
          path: 'nation',
          name: 'nation',
          component: NationView
        },
        {
          path: 'account',
          name: 'account',
          component: AccountView
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/home'
    }
  ]
})

export default router
