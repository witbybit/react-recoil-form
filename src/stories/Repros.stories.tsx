import FieldArrayRepro from './repros/FieldArrayRepro';
import React from 'react';
import ResetFieldRepro from './repros/ResetFieldRepro';
import DragNDropRepro from './repros/DragNDropRepro';

export default {
  title: 'Repros',
};

export function FieldArrayReproStory() {
  return <FieldArrayRepro />;
}

export function ResetFieldReproStory() {
  return <ResetFieldRepro />;
}

export function DragNDropReproStory() {
  return <DragNDropRepro />;
}
