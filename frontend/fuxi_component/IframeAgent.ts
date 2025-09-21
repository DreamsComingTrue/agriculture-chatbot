import { createPopper } from '@popperjs/core/lib/popper-lite';
import { Placement } from '@popperjs/core/lib/enums';
import type { Instance } from '@popperjs/core/lib/types';

export interface IframeAgentOptions {
  iframeUrl: string;
  robotIconUrl?: string;
  width?: number;
  height?: number;
  container?: HTMLElement | string; // Add container option
  placement?: Placement;
}

export class IframeAgent {
  private options: IframeAgentOptions;
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLDivElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private isOpen = false;
  private popperInstance: Instance | null = null;
  private parentElement: HTMLElement = document.body; // Default parent

  constructor(options: IframeAgentOptions) {
    this.options = {
      width: 350,
      height: 500,
      iframeUrl: `http://${window.location.hostname}:4173`,
      robotIconUrl: 'https://example.com/robot-icon.png',
      ...options
    };

    this.resolveContainerOption()
    this.initContainer();
  }

  private resolveContainerOption() {
    if (this.options.container) {
      if (typeof this.options.container === 'string') {
        // String selector
        const element = document.querySelector(this.options.container) as HTMLElement;
        if (element) {
          this.parentElement = element;
        } else {
          console.warn(`Container selector "${this.options.container}" not found, using document.body`);
          this.parentElement = document.body;
        }
      } else if (this.options.container instanceof HTMLElement) {
        // HTMLElement instance
        this.parentElement = this.options.container;
      }
    }
  }

  private initContainer() {
    // Create mountable container
    this.container = document.createElement('div');
    this.container.className = 'iframe-agent-container';
    this.parentElement.appendChild(this.container);

    // Create iframe (hidden by default)
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.options.iframeUrl;
    this.iframe.style.width = `${Math.min(this.options.width || 350, window.innerWidth - 20)}px`;
    this.iframe.style.height = `${this.options.height}px`;
    this.iframe.style["max-width"] = `${window.innerWidth - 20}px`;
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '8px';
    this.iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    this.iframe.style.display = 'none';
    this.iframe.style.position = 'absolute'; // Required for Popper
    this.iframe.allow = `microphone ${this.options.iframeUrl}; 
         camera ${this.options.iframeUrl};
         autoplay ${this.options.iframeUrl};
         clipboard-write;
         display-capture`
    this.iframe.sandbox = "allow-same-origin allow-scripts allow-modals allow-forms"
    this.iframe.referrerPolicy = "strict-origin-when-cross-origin"
    this.parentElement.appendChild(this.iframe);

    // Create toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'iframe-agent-toggle';
    this.toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"/>
        <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"/>
      </svg>
    `;
    this.toggleBtn.style.background = 'none';
    this.toggleBtn.style.border = 'none';
    this.toggleBtn.style.cursor = 'pointer';
    this.toggleBtn.style.zIndex = '10000';
    this.toggleBtn.addEventListener('click', () => this.toggleIframe());
    this.container.appendChild(this.toggleBtn);

    // Initialize Popper (hidden by default)
    if (this.iframe && this.toggleBtn) {
      this.popperInstance = createPopper(this.toggleBtn, this.iframe, {
        placement: this.options.placement ?? "auto",
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              boundary: document.body,
              padding: 50,
            },
          },
          {
            name: 'offset',
            options: {
              offset: [20, 20],
            },
          },
        ],
      });
    }

    // Add viewport resize handler
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (this.popperInstance) {
      this.popperInstance.update();
    }
    if (this.iframe) {
      this.iframe.style.maxWidth = `${window.innerWidth - 20}px`;
    }
  };

  public mount(parentElement: HTMLElement = document.body) {
    if (this.container && !parentElement.contains(this.container)) {
      parentElement.appendChild(this.container);
    }
    if (this.iframe && !parentElement.contains(this.iframe)) {
      parentElement.appendChild(this.iframe);
    }
  }

  public unmount() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

  }

  private toggleIframe() {
    if (!this.iframe || !this.popperInstance) return;

    this.isOpen = !this.isOpen;
    this.iframe.style.display = this.isOpen ? 'block' : 'none';

    // Update popper position when shown
    if (this.isOpen) {
      this.popperInstance.update();
    }

    this.postMessage({
      type: 'IFRAME_VISIBILITY_CHANGE',
      isVisible: this.isOpen
    });
  }

  private postMessage(message: any) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(
        message,
        new URL(this.options.iframeUrl).origin
      );
    }
  }

  public destroy() {
    this.unmount();
    this.iframe = null;
    this.container = null;
    this.toggleBtn = null;
    this.popperInstance = null;
    window.removeEventListener('resize', this.handleResize);
  }
}
