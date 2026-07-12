import { registerRootComponent } from "expo";
import App from "./App";

// expo/AppEntry's own relative import ("../../App") assumes node_modules/expo
// sits directly inside this app's own folder. In an npm-workspaces monorepo,
// expo hoists to the repo root instead, so that path resolves to the wrong
// place. This local entry file sidesteps it entirely.
registerRootComponent(App);
