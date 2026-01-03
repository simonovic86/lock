/**
 * Form component for creating time-locked vaults
 *
 * COMMITMENT MODEL:
 * Vault creation has two explicit phases with an irreversible boundary:
 *
 * 1. DRAFT - Local encryption only, reversible
 *    - Encrypts plaintext with a new key
 *    - Holds encrypted payload + raw key in memory
 *    - No Lit Protocol calls
 *    - No persistence
 *    - Can be discarded
 *
 * 2. ARM - Finalization, irreversible
 *    - Single action moves draft → armed
 *    - Calls Lit Protocol to create time-lock
 *    - Persists vault to storage
 *    - Immediately wipes all sensitive draft data
 *    - No undo, no recovery
 *
 * The boundary between Draft and Arm is the point of no return.
 */

import { Component } from '../lib/component';
import { generateKey, exportKey, encrypt } from '../lib/crypto';
import { toBase64 } from '../lib/encoding';
import { initLit, encryptKeyWithTimelock } from '../lib/lit';
import { saveVaultRef, VaultRef } from '../lib/storage';
import styles from '../styles/CreateVaultForm.module.css';

/**
 * Draft object - exists ONLY in memory until armed.
 * Contains sensitive key material that must be wiped after arming.
 */
interface VaultDraft {
  unlockTime: number;
  destroyAfterRead: boolean;
  // Sensitive: must be zeroed after arm
  rawKey: Uint8Array;
  encryptedData: Uint8Array;
  // Derived from encryptedData
  inlineData: string;
}

interface State {
  step: 'form' | 'encrypting' | 'draft' | 'arming';
  error: string | null;
  secret: string;
  unlockDate: string;
  unlockTime: string;
  destroyAfterRead: boolean;
}

export class CreateVaultForm extends Component<State> {
  private onCreate: (vault: VaultRef) => void;

  // Draft lives only in memory - never persisted
  private draft: VaultDraft | null = null;

  constructor(onCreate: (vault: VaultRef) => void) {
    super({
      step: 'form',
      error: null,
      secret: '',
      unlockDate: '',
      unlockTime: '',
      destroyAfterRead: false,
    });
    this.onCreate = onCreate;
  }

  protected render(): HTMLElement {
    const container = this.createElement('div', [styles.card]);
    this.renderContent(container);
    return container;
  }

  protected update(): void {
    this.element.innerHTML = '';
    this.renderContent(this.element);
  }

  private renderContent(container: HTMLElement): void {
    switch (this.state.step) {
      case 'form':
        this.renderForm(container);
        break;
      case 'encrypting':
        this.renderEncrypting(container);
        break;
      case 'draft':
        this.renderDraft(container);
        break;
      case 'arming':
        this.renderArming(container);
        break;
    }
  }

  private renderForm(container: HTMLElement): void {
    const heading = this.createElement('h2', [styles.heading]);
    heading.textContent = 'Create a Vault';
    container.appendChild(heading);

    const form = this.createElement('form', [styles.form]);
    form.addEventListener('submit', (e) => this.handleCreateDraft(e));

    // Secret textarea
    const secretField = this.createElement('div', [styles.field]);
    const secretLabel = this.createElement('label', [styles.fieldLabel]);
    secretLabel.textContent = 'Your Secret';
    const secretTextarea = document.createElement('textarea');
    secretTextarea.className = `${styles.input} ${styles.textarea}`;
    secretTextarea.placeholder = 'Enter your secret message...';
    secretTextarea.required = true;
    secretTextarea.rows = 4;
    secretTextarea.value = this.state.secret;
    secretTextarea.addEventListener('input', (e) => {
      this.state.secret = (e.target as HTMLTextAreaElement).value;
    });
    secretField.appendChild(secretLabel);
    secretField.appendChild(secretTextarea);
    form.appendChild(secretField);

    // Date field
    const dateField = this.createElement('div', [styles.field]);
    const dateLabel = this.createElement('label', [styles.fieldLabel]);
    dateLabel.textContent = 'Unlock Date';
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = styles.input;
    dateInput.required = true;
    dateInput.value = this.state.unlockDate;
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.addEventListener('input', (e) => {
      this.state.unlockDate = (e.target as HTMLInputElement).value;
    });
    dateField.appendChild(dateLabel);
    dateField.appendChild(dateInput);
    form.appendChild(dateField);

    // Time field
    const timeField = this.createElement('div', [styles.field]);
    const timeLabel = this.createElement('label', [styles.fieldLabel]);
    timeLabel.textContent = 'Unlock Time';
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = styles.input;
    timeInput.required = true;
    timeInput.value = this.state.unlockTime;
    timeInput.addEventListener('input', (e) => {
      this.state.unlockTime = (e.target as HTMLInputElement).value;
    });
    timeField.appendChild(timeLabel);
    timeField.appendChild(timeInput);
    form.appendChild(timeField);

    // Destroy after read checkbox
    const checkboxWrapper = this.createElement('label', [styles.checkboxLabel]);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = styles.checkbox;
    checkbox.checked = this.state.destroyAfterRead;
    checkbox.addEventListener('change', (e) => {
      this.state.destroyAfterRead = (e.target as HTMLInputElement).checked;
    });
    const checkboxText = this.createElement('span', [styles.checkboxText]);
    checkboxText.textContent = 'Destroy after reading';
    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(checkboxText);
    form.appendChild(checkboxWrapper);

    // Error display
    if (this.state.error) {
      const errorDiv = this.createElement('div', [styles.error]);
      errorDiv.textContent = this.state.error;
      form.appendChild(errorDiv);
    }

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn-primary';
    submitBtn.textContent = 'Prepare Vault';
    form.appendChild(submitBtn);

    container.appendChild(form);
  }

  private renderEncrypting(container: HTMLElement): void {
    const title = this.createElement('h2', [styles.progressTitle]);
    title.textContent = 'Encrypting';
    container.appendChild(title);

    const spinner = this.createElement('div', [styles.progressIconActive]);
    spinner.style.margin = '2rem auto';
    container.appendChild(spinner);

    const text = this.createElement('p', [styles.progressFooter]);
    text.textContent = 'Preparing your vault...';
    container.appendChild(text);
  }

  private renderDraft(container: HTMLElement): void {
    if (!this.draft) {
      this.resetToForm();
      return;
    }

    const heading = this.createElement('h2', [styles.heading]);
    heading.textContent = 'Vault Ready';
    container.appendChild(heading);

    // Info card
    const infoCard = this.createElement('div', [styles.linkContainer]);

    const unlockLabel = this.createElement('p', [styles.linkLabel]);
    unlockLabel.textContent = 'Unlock Time';
    const unlockValue = this.createElement('p', [styles.linkText]);
    unlockValue.textContent = new Date(this.draft.unlockTime).toLocaleString();
    infoCard.appendChild(unlockLabel);
    infoCard.appendChild(unlockValue);

    if (this.draft.destroyAfterRead) {
      const destroyNote = this.createElement('p', [styles.hint]);
      destroyNote.textContent = 'Will be destroyed after reading';
      destroyNote.style.marginTop = '0.5rem';
      infoCard.appendChild(destroyNote);
    }

    container.appendChild(infoCard);

    // Error display
    if (this.state.error) {
      const errorDiv = this.createElement('div', [styles.error]);
      errorDiv.textContent = this.state.error;
      container.appendChild(errorDiv);
    }

    // Button row
    const buttonRow = this.createElement('div', [styles.buttonRow]);

    const discardBtn = document.createElement('button');
    discardBtn.type = 'button';
    discardBtn.className = `btn-secondary ${styles.buttonFlex}`;
    discardBtn.textContent = 'Discard';
    discardBtn.addEventListener('click', () => this.discardDraft());
    buttonRow.appendChild(discardBtn);

    const armBtn = document.createElement('button');
    armBtn.type = 'button';
    armBtn.className = `btn-primary ${styles.buttonFlex}`;
    armBtn.textContent = 'Arm Vault';
    armBtn.addEventListener('click', () => this.armDraft());
    buttonRow.appendChild(armBtn);

    container.appendChild(buttonRow);
  }

  private renderArming(container: HTMLElement): void {
    const title = this.createElement('h2', [styles.progressTitle]);
    title.textContent = 'Arming Vault';
    container.appendChild(title);

    const steps = this.createElement('div', [styles.progressSteps]);

    const stepConfigs = [
      { key: 'locking', label: 'Creating time lock' },
      { key: 'saving', label: 'Finalizing vault' },
    ];

    stepConfigs.forEach((stepConfig) => {
      const stepDiv = this.createElement('div', [
        styles.progressStep,
        styles.progressStepActive,
      ]);

      const iconDiv = this.createElement('div', [styles.progressIcon]);
      const spinner = this.createElement('div', [styles.progressIconActive]);
      iconDiv.appendChild(spinner);
      stepDiv.appendChild(iconDiv);

      const labelDiv = this.createElement('div', [
        styles.progressLabel,
        styles.progressLabelActive,
      ]);
      labelDiv.textContent = stepConfig.label;
      stepDiv.appendChild(labelDiv);

      steps.appendChild(stepDiv);
    });

    container.appendChild(steps);

    const footer = this.createElement('p', [styles.progressFooter]);
    footer.textContent = 'This cannot be undone...';
    container.appendChild(footer);
  }

  /**
   * PHASE 1: Create Draft
   * - Encrypts plaintext locally
   * - Stores encrypted data + raw key in memory
   * - No Lit calls, no persistence
   */
  private async handleCreateDraft(e: Event): Promise<void> {
    e.preventDefault();

    const { secret, unlockDate, unlockTime, destroyAfterRead } = this.state;

    const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
    const unlockTimeMs = unlockDateTime.getTime();

    if (unlockTimeMs <= Date.now()) {
      this.setState({ error: 'Unlock time must be in the future' });
      return;
    }

    try {
      this.setState({ step: 'encrypting', error: null });

      // Generate key and encrypt locally - no network calls
      const key = await generateKey();
      const rawKey = await exportKey(key);
      const encryptedData = await encrypt(secret, key);
      const inlineData = toBase64(encryptedData);

      // Store draft in memory only - never persisted
      this.draft = {
        unlockTime: unlockTimeMs,
        destroyAfterRead,
        rawKey,
        encryptedData,
        inlineData,
      };

      // Clear secret from state immediately
      this.setState({
        step: 'draft',
        secret: '',
        error: null,
      });
    } catch (err) {
      console.error('Failed to create draft:', err);
      this.setState({
        step: 'form',
        error: err instanceof Error ? err.message : 'Encryption failed',
      });
    }
  }

  /**
   * Discard draft - wipe sensitive data and return to form
   */
  private discardDraft(): void {
    this.wipeDraft();
    this.resetToForm();
  }

  /**
   * PHASE 2: Arm Draft (IRREVERSIBLE)
   * - Calls Lit Protocol to create time-lock
   * - Persists vault to storage
   * - Wipes all sensitive draft data
   * - No undo
   */
  private async armDraft(): Promise<void> {
    if (!this.draft) {
      this.resetToForm();
      return;
    }

    // Capture draft reference - after this point, arming is committed
    const draft = this.draft;

    try {
      this.setState({ step: 'arming', error: null });

      // === POINT OF NO RETURN ===

      // Create time-lock with Lit Protocol
      await initLit();
      const { encryptedKey, encryptedKeyHash } = await encryptKeyWithTimelock(
        draft.rawKey,
        draft.unlockTime,
      );

      // Build vault reference
      const vault: VaultRef = {
        id: crypto.randomUUID(),
        unlockTime: draft.unlockTime,
        litEncryptedKey: encryptedKey,
        litKeyHash: encryptedKeyHash,
        createdAt: Date.now(),
        inlineData: draft.inlineData,
        destroyAfterRead: draft.destroyAfterRead,
      };

      // Persist vault
      await saveVaultRef(vault);

      // === WIPE ALL SENSITIVE DATA ===
      this.wipeDraft();

      // Notify parent and reset
      this.onCreate(vault);
      this.resetToForm();
    } catch (err) {
      console.error('Failed to arm vault:', err);
      // On error, draft remains - user can retry or discard
      this.setState({
        step: 'draft',
        error: err instanceof Error ? err.message : 'Failed to arm vault',
      });
    }
  }

  /**
   * Securely wipe all draft data.
   * Zeros out sensitive Uint8Arrays to prevent memory recovery.
   */
  private wipeDraft(): void {
    if (!this.draft) return;

    // Zero out sensitive byte arrays
    if (this.draft.rawKey) {
      this.draft.rawKey.fill(0);
    }
    if (this.draft.encryptedData) {
      this.draft.encryptedData.fill(0);
    }

    // Clear all references
    this.draft = null;
  }

  /**
   * Reset to initial form state
   */
  private resetToForm(): void {
    this.setState({
      step: 'form',
      error: null,
      secret: '',
      unlockDate: '',
      unlockTime: '',
      destroyAfterRead: false,
    });
  }
}
