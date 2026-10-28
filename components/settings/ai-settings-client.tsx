"use client";

import { InlineAlert } from "@/components/ui/inline-alert";
import { SUPPORTED_PROVIDERS } from "@/lib/ai-service";
import { AIProviderCard } from "./ai-provider-card";
import { AIStatusCard } from "./ai-status-card";
import { useAISettings } from "./use-ai-settings";

export function AISettingsClient() {
  const {
    activeProvider,
    activeModel,
    generalError,
    fetchingModels,
    customModelMode,
    providerStates,
    isCurrentActiveConfigured,
    handleKeyChange,
    handleUrlChange,
    handleModelChange,
    handleSaveKey,
    handleRemoveKey,
    handleFetchModels,
    handleTestConnection,
    handleSetActive,
    toggleShowSecret,
    toggleCustomModelMode,
  } = useAISettings();

  return (
    <div className="w-full space-y-6">
      <AIStatusCard
        isConfigured={isCurrentActiveConfigured}
        activeProvider={activeProvider}
        activeModel={activeModel}
        providerStates={providerStates}
        onSetActive={handleSetActive}
        onModelChange={handleModelChange}
      />

      {generalError && <InlineAlert variant="error" message={generalError} />}

      {/* Info Notice */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-xs text-sky-800">
        <p className="font-semibold text-sky-900">Privacy &amp; Credential Security</p>
        <p className="mt-1 leading-relaxed text-sky-700">
          API keys are stored exclusively inside your browser&apos;s local storage.
          Keys are sent per-request directly to the AI provider and are never committed to our backend database.
        </p>
      </div>

      {/* Provider List Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Providers</h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SUPPORTED_PROVIDERS.map((provider) => {
            const state = providerStates[provider];
            const isConfigured = state.status === "connected" || state.status === "saved";
            const isCardActive = activeProvider === provider && isConfigured;
            const isCustom = Boolean(customModelMode[provider]);

            return (
              <AIProviderCard
                key={provider}
                provider={provider}
                state={state}
                isActive={isCardActive}
                isCustom={isCustom}
                isFetchingModels={Boolean(fetchingModels[provider])}
                onKeyChange={(val) => handleKeyChange(provider, val)}
                onUrlChange={provider === "9router-public" ? handleUrlChange : undefined}
                onModelChange={(model) => handleModelChange(provider, model)}
                onToggleCustomMode={() => toggleCustomModelMode(provider)}
                onToggleShowSecret={() => toggleShowSecret(provider)}
                onFetchModels={() => handleFetchModels(provider)}
                onSaveKey={() => handleSaveKey(provider)}
                onRemoveKey={() => handleRemoveKey(provider)}
                onTestConnection={() => handleTestConnection(provider)}
                onSetActive={() => handleSetActive(provider)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
