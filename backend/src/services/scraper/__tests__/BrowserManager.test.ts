import { BrowserManager, BrowserConfig } from '../BrowserManager';
import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';

// Mock puppeteer-extra
jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn()
}));

// Mock stealth plugin
jest.mock('puppeteer-extra-plugin-stealth', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('BrowserManager', () => {
  let browserManager: BrowserManager;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  const defaultConfig: BrowserConfig = {
    headless: true,
    timeout: 30000,
    viewport: { width: 1366, height: 768 }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock browser and page
    mockPage = {
      setUserAgent: jest.fn(),
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
      isClosed: jest.fn().mockReturnValue(false)
    } as any;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    } as any;

    (puppeteerExtra.launch as jest.Mock).mockResolvedValue(mockBrowser);

    browserManager = new BrowserManager(defaultConfig);
  });

  afterEach(async () => {
    await browserManager.close();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const config: BrowserConfig = {
        headless: false,
        userAgent: 'custom-agent',
        viewport: { width: 1920, height: 1080 },
        timeout: 60000
      };

      const manager = new BrowserManager(config);
      expect(manager).toBeInstanceOf(BrowserManager);
    });
  });

  describe('initialize', () => {
    it('should launch browser with correct configuration', async () => {
      await browserManager.initialize();

      expect(puppeteerExtra.launch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });
    });

    it('should not reinitialize if browser already exists', async () => {
      await browserManager.initialize();
      await browserManager.initialize();

      expect(puppeteerExtra.launch).toHaveBeenCalledTimes(1);
    });

    it('should use default viewport if not provided', async () => {
      const configWithoutViewport: BrowserConfig = {
        headless: true,
        timeout: 30000
      };

      const manager = new BrowserManager(configWithoutViewport);
      await manager.initialize();

      expect(puppeteerExtra.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultViewport: { width: 1366, height: 768 }
        })
      );

      await manager.close();
    });
  });

  describe('createPage', () => {
    it('should create and configure a new page', async () => {
      const page = await browserManager.createPage();

      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setDefaultNavigationTimeout).toHaveBeenCalledWith(30000);
      expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
      expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
      expect(page).toBe(mockPage);
    });

    it('should set user agent if provided', async () => {
      const configWithUserAgent: BrowserConfig = {
        ...defaultConfig,
        userAgent: 'custom-user-agent'
      };

      const manager = new BrowserManager(configWithUserAgent);
      await manager.createPage();

      expect(mockPage.setUserAgent).toHaveBeenCalledWith('custom-user-agent');

      await manager.close();
    });

    it('should not set user agent if not provided', async () => {
      await browserManager.createPage();

      expect(mockPage.setUserAgent).not.toHaveBeenCalled();
    });

    it('should initialize browser if not already initialized', async () => {
      expect(browserManager.isInitialized()).toBe(false);

      await browserManager.createPage();

      expect(puppeteerExtra.launch).toHaveBeenCalled();
      expect(browserManager.isInitialized()).toBe(true);
    });

    it('should configure request interception to block resources', async () => {
      await browserManager.createPage();

      const requestHandler = (mockPage.on as jest.Mock).mock.calls.find(
        call => call[0] === 'request'
      )[1];

      // Test blocking stylesheet
      const mockStylesheetRequest = {
        resourceType: () => 'stylesheet',
        abort: jest.fn(),
        continue: jest.fn()
      };
      requestHandler(mockStylesheetRequest);
      expect(mockStylesheetRequest.abort).toHaveBeenCalled();
      expect(mockStylesheetRequest.continue).not.toHaveBeenCalled();

      // Test blocking font
      const mockFontRequest = {
        resourceType: () => 'font',
        abort: jest.fn(),
        continue: jest.fn()
      };
      requestHandler(mockFontRequest);
      expect(mockFontRequest.abort).toHaveBeenCalled();

      // Test blocking image
      const mockImageRequest = {
        resourceType: () => 'image',
        abort: jest.fn(),
        continue: jest.fn()
      };
      requestHandler(mockImageRequest);
      expect(mockImageRequest.abort).toHaveBeenCalled();

      // Test allowing document
      const mockDocumentRequest = {
        resourceType: () => 'document',
        abort: jest.fn(),
        continue: jest.fn()
      };
      requestHandler(mockDocumentRequest);
      expect(mockDocumentRequest.continue).toHaveBeenCalled();
      expect(mockDocumentRequest.abort).not.toHaveBeenCalled();
    });
  });

  describe('closePage', () => {
    it('should close page if not already closed', async () => {
      mockPage.isClosed.mockReturnValue(false);

      await browserManager.closePage(mockPage);

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should not close page if already closed', async () => {
      mockPage.isClosed.mockReturnValue(true);

      await browserManager.closePage(mockPage);

      expect(mockPage.close).not.toHaveBeenCalled();
    });

    it('should handle null page gracefully', async () => {
      await expect(browserManager.closePage(null as any)).resolves.not.toThrow();
    });
  });

  describe('close', () => {
    it('should close browser and reset state', async () => {
      await browserManager.initialize();
      expect(browserManager.isInitialized()).toBe(true);

      await browserManager.close();

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(browserManager.isInitialized()).toBe(false);
    });

    it('should handle closing when browser is not initialized', async () => {
      expect(browserManager.isInitialized()).toBe(false);

      await expect(browserManager.close()).resolves.not.toThrow();
    });
  });

  describe('isInitialized', () => {
    it('should return false initially', () => {
      expect(browserManager.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await browserManager.initialize();
      expect(browserManager.isInitialized()).toBe(true);
    });

    it('should return false after closing', async () => {
      await browserManager.initialize();
      await browserManager.close();
      expect(browserManager.isInitialized()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle browser launch failure', async () => {
      (puppeteerExtra.launch as jest.Mock).mockRejectedValue(new Error('Launch failed'));

      await expect(browserManager.initialize()).rejects.toThrow('Launch failed');
    });

    it('should handle page creation failure', async () => {
      mockBrowser.newPage.mockRejectedValue(new Error('Page creation failed'));

      await expect(browserManager.createPage()).rejects.toThrow('Page creation failed');
    });

    it('should handle page close failure', async () => {
      mockPage.close.mockRejectedValue(new Error('Close failed'));
      mockPage.isClosed.mockReturnValue(false);

      await expect(browserManager.closePage(mockPage)).rejects.toThrow('Close failed');
    });

    it('should handle browser close failure', async () => {
      await browserManager.initialize();
      mockBrowser.close.mockRejectedValue(new Error('Browser close failed'));

      await expect(browserManager.close()).rejects.toThrow('Browser close failed');
    });
  });
});