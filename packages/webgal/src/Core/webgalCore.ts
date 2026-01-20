import { SteamIntegration } from '@/Core/integration/steamIntegration';
import { AnimationManager } from '@/Core/Modules/animations';
import { BacklogManager } from '@/Core/Modules/backlog';
import { Events } from '@/Core/Modules/events';
import { SceneManager } from '@/Core/Modules/scene';
import type { WebgalTemplate } from '@/types/template';
import { Gameplay } from './Modules/gamePlay';

export class WebgalCore {
  public sceneManager = new SceneManager();
  public backlogManager = new BacklogManager(this.sceneManager);
  public animationManager = new AnimationManager();
  public gameplay = new Gameplay();
  public gameName = '';
  public gameKey = '';
  public events = new Events();
  public steam = new SteamIntegration();
  public template: WebgalTemplate | null = null;
}
