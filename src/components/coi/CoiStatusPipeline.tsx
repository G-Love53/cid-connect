import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { COIRequest } from '@/types';
import { COI_STATUS_STEPS } from '@/lib/coiUtils';

interface Props {
  status: COIRequest['status'];
  compact?: boolean;
}

const CoiStatusPipeline: React.FC<Props> = ({ status, compact = false }) => {
  if (status === 'failed') {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-red-700`}>
        <XCircle className="w-4 h-4" />
        <span>Could not complete — our team will follow up.</span>
      </div>
    );
  }

  const activeIndex =
    status === 'completed'
      ? COI_STATUS_STEPS.length
      : COI_STATUS_STEPS.findIndex((step) => step.key === status);

  return (
    <div className={`grid grid-cols-3 gap-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {COI_STATUS_STEPS.map((step, index) => {
        const done = activeIndex > index || status === 'completed';
        const current = activeIndex === index && status !== 'completed';
        return (
          <div key={step.key} className="flex flex-col items-center text-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                done
                  ? 'bg-green-100 text-green-700'
                  : current
                    ? 'bg-orange-100 text-[#F7941D]'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : current ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            <span className={done || current ? 'text-gray-700 font-medium' : 'text-gray-400'}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CoiStatusPipeline;
