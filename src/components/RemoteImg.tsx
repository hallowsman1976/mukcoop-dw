import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { fileId?: string };

/**
 * <img> for attachments. Freshly captured files carry a data URL; files stored in the private
 * Drive folder carry only a fileId and are fetched (with the user's session) on demand.
 */
export const RemoteImg: React.FC<Props> = ({ fileId, src, alt, ...rest }) => {
  const [remote, setRemote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (src || !fileId) return;
    let cancelled = false;
    StorageService.fetchAttachment(fileId)
      .then((u) => !cancelled && setRemote(u))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [fileId, src]);

  const finalSrc = src || remote;
  if (!finalSrc) {
    return (
      <div
        className={`${rest.className || ''} flex items-center justify-center bg-slate-100 text-[10px] text-slate-400`}
        aria-label={alt}
      >
        {failed ? 'โหลดไฟล์ไม่ได้' : 'กำลังโหลด…'}
      </div>
    );
  }
  return <img {...rest} src={finalSrc} alt={alt} />;
};
