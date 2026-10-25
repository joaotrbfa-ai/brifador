import React, { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import Image from 'next/image';
import { UpdateDialog } from "./UpdateDialog";
import { updateService, UpdateInfo } from '@/services/updateService';
import { Button } from './ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import BrandFooter from './BrandFooter';


export function About() {
    const [currentVersion, setCurrentVersion] = useState<string>('0.4.1');
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);

    useEffect(() => {
        // Get current version on mount
        getVersion().then(setCurrentVersion).catch(console.error);
    }, []);

    const handleCreditClick = async () => {
        try {
            await invoke('open_external_url', { url: 'https://github.com/Zackriya-Solutions/meetily' });
        } catch (error) {
            console.error('Failed to open link:', error);
        }
    };

    const handleCheckForUpdates = async () => {
        setIsChecking(true);
        try {
            const info = await updateService.checkForUpdates(true);
            setUpdateInfo(info);
            if (info.available) {
                setShowUpdateDialog(true);
            } else {
                toast.success('Você está usando a versão mais recente');
            }
        } catch (error: any) {
            console.error('Failed to check for updates:', error);
            toast.error('Não foi possível verificar atualizações: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="p-4 space-y-4 h-[80vh] overflow-y-auto">
            {/* Compact Header */}
            <div className="text-center">
                <div className="mb-3">
                    <Image
                        src="icon_128x128.png"
                        alt="Logotipo do Brifador"
                        width={64}
                        height={64}
                        className="mx-auto"
                    />
                </div>
                {/* <h1 className="text-xl font-bold text-foreground">Meetily</h1> */}
                <span className="text-sm text-muted-foreground"> v{currentVersion}</span>
                <p className="text-medium text-muted-foreground mt-1">
                    Notas e resumos em tempo real que nunca saem do seu computador.
                </p>
                <div className="mt-3">
                    <Button
                        onClick={handleCheckForUpdates}
                        disabled={isChecking}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                    >
                        {isChecking ? (
                            <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Verificar atualizações
                            </>
                        )}
                    </Button>
                    {updateInfo?.available && (
                        <div className="mt-2 text-xs text-primary">
                            Atualização disponível: v{updateInfo.version}
                        </div>
                    )}
                </div>
            </div>

            {/* Features Grid - Compact */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">O que torna o Brifador diferente</h2>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background rounded p-3 hover:bg-secondary transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Privacidade em primeiro lugar</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Seus dados e o processamento de IA podem ficar no seu próprio computador. Sem nuvem, sem vazamentos.</p>
                    </div>
                    <div className="bg-background rounded p-3 hover:bg-secondary transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Use qualquer modelo</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Prefere um modelo local de código aberto? Ótimo. Quer conectar uma API externa? Também pode. Sem dependência de fornecedor.</p>
                    </div>
                    <div className="bg-background rounded p-3 hover:bg-secondary transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Econômico</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Evite cobranças por minuto rodando os modelos localmente (ou pague apenas pelas chamadas que escolher).</p>
                    </div>
                    <div className="bg-background rounded p-3 hover:bg-secondary transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Funciona em qualquer lugar</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Google Meet, Zoom, Teams, online ou offline.</p>
                    </div>
                </div>
            </div>

            {/* Footer - Compact */}
            <div className="pt-2 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                    Baseado no{' '}
                    <button
                        type="button"
                        onClick={handleCreditClick}
                        className="underline hover:text-muted-foreground"
                    >
                        Meetily
                    </button>
                    , da Zackriya Solutions (licença MIT)
                </p>
            </div>

            {/* Update Dialog */}
            <UpdateDialog
                open={showUpdateDialog}
                onOpenChange={setShowUpdateDialog}
                updateInfo={updateInfo}
            />
        </div>

    )
}