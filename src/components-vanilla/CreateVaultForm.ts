/**
 * Form component for creating time-locked vaults
 */

import { Component } from '../lib/component';
import { generateKey, exportKey, encrypt } from '../lib/crypto';
import { toBase64 } from '../lib/encoding';
import { initLit, encryptKeyWithTimelock } from '../lib/lit';
import { saveVaultRef, VaultRef } from '../lib/storage';
import styles from '../styles/CreateVaultForm.module.css';

interface State {
  step: 'form' | 'encrypting' | 'locking' | 'saving';
  error: string | null;
  secret: string;
  unlockDate: string;
  unlockTime: string;
  destroyAfterRead: boolean;
}

export class CreateVaultForm extends Component<State> {
  private onCreate: (vault: VaultRef) => void;

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
    if (this.state.step !== 'form') {
      this.renderProgress(container);
      return;
    }

    const heading = this.createElement('h2', [styles.heading]);
    heading.textContent = 'Create a Vault';
    container.appendChild(heading);

    const form = this.createElement('form', [styles.form]);
    form.addEventListener('submit', (e) => this.handleSubmit(e));

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
    submitBtn.textContent = 'Create Vault';
    form.appendChild(submitBtn);

    container.appendChild(form);
  }

  private renderProgress(container: HTMLElement): void {
    const title = this.createElement('h2', [styles.progressTitle]);
    title.textContent = 'Creating Vault';
    container.appendChild(title);

    const steps = this.createElement('div', [styles.progressSteps]);

    const stepConfigs = [
      { key: 'encrypting', label: 'Encrypting your secret' },
      { key: 'locking', label: 'Creating time lock' },
      { key: 'saving', label: 'Saving vault' },
    ];

    const currentIndex = stepConfigs.findIndex(
      (s) => s.key === this.state.step,
    );

    stepConfigs.forEach((stepConfig, index) => {
      const isDone = index < currentIndex;
      const isActive = index === currentIndex;
      const isPending = index > currentIndex;

      const stepDiv = this.createElement('div', [
        styles.progressStep,
        isDone
          ? styles.progressStepDone
          : isActive
            ? styles.progressStepActive
            : styles.progressStepPending,
      ]);

      // Icon
      const iconDiv = this.createElement('div', [styles.progressIcon]);
      if (isDone) {
        const doneIcon = this.createElement('div', [styles.progressIconDone]);
        const checkSvg = this.createSVG('M5 13l4 4L19 7', [
          styles.progressIconDoneCheck,
        ]);
        doneIcon.appendChild(checkSvg);
        iconDiv.appendChild(doneIcon);
      } else if (isActive) {
        const spinner = this.createElement('div', [styles.progressIconActive]);
        iconDiv.appendChild(spinner);
      } else {
        const pending = this.createElement('div', [styles.progressIconPending]);
        iconDiv.appendChild(pending);
      }
      stepDiv.appendChild(iconDiv);

      // Label
      const labelDiv = this.createElement('div', [
        styles.progressLabel,
        isDone
          ? styles.progressLabelDone
          : isActive
            ? styles.progressLabelActive
            : styles.progressLabelPending,
      ]);
      labelDiv.textContent = stepConfig.label;
      stepDiv.appendChild(labelDiv);

      steps.appendChild(stepDiv);
    });

    container.appendChild(steps);

    const footer = this.createElement('p', [styles.progressFooter]);
    footer.textContent = 'This may take a moment...';
    container.appendChild(footer);
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const { secret, unlockDate, unlockTime, destroyAfterRead } = this.state;

    // Parse unlock time
    const unlockDateTime = new Date(`${unlockDate}T${unlockTime}`);
    const unlockTimeMs = unlockDateTime.getTime();

    if (unlockTimeMs <= Date.now()) {
      this.setState({ error: 'Unlock time must be in the future' });
      return;
    }

    try {
      // Step 1: Encrypt the secret
      this.setState({ step: 'encrypting', error: null });

      const key = await generateKey();
      const rawKey = await exportKey(key);
      const encryptedData = await encrypt(secret, key);
      const inlineData = toBase64(encryptedData);

      // Step 2: Create time lock with Lit Protocol
      this.setState({ step: 'locking' });

      await initLit();
      const { encryptedKey, encryptedKeyHash } = await encryptKeyWithTimelock(
        rawKey,
        unlockTimeMs,
      );

      // Step 3: Save vault
      this.setState({ step: 'saving' });

      const vault: VaultRef = {
        id: crypto.randomUUID(),
        unlockTime: unlockTimeMs,
        litEncryptedKey: encryptedKey,
        litKeyHash: encryptedKeyHash,
        createdAt: Date.now(),
        inlineData,
        destroyAfterRead,
      };

      await saveVaultRef(vault);

      // Notify parent and reset form
      this.onCreate(vault);
      this.setState({
        step: 'form',
        secret: '',
        unlockDate: '',
        unlockTime: '',
        destroyAfterRead: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to create vault:', err);
      this.setState({
        step: 'form',
        error: err instanceof Error ? err.message : 'Failed to create vault',
      });
    }
  }
}
