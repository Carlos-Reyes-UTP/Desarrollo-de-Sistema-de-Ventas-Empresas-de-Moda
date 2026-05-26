/**
 * Material Tailwind v2.1.10 ships types built for React 18.
 * Its component props extend React.ComponentProps which changed in React 19
 * (they removed `children` from the implicit typing of some elements).
 *
 * This module augmentation relaxes the types so the IDE stops showing
 * false-positive errors while we wait for an official v3 release.
 */

import type { ReactNode } from 'react';

interface MTBaseProps {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

declare module '@material-tailwind/react' {
  export function Typography(props: MTBaseProps): JSX.Element;
  export function List(props: MTBaseProps): JSX.Element;
  export function ListItem(props: MTBaseProps & {
    selected?: boolean;
    onClick?: () => void;
  }): JSX.Element;
  export function Accordion(props: MTBaseProps & {
    open: boolean;
  }): JSX.Element;
  export function AccordionHeader(props: MTBaseProps & {
    onClick?: () => void;
  }): JSX.Element;
  export function AccordionBody(props: MTBaseProps): JSX.Element;
  export function Drawer(props: MTBaseProps & {
    open: boolean;
    onClose: () => void;
    placement?: string;
    size?: number;
    overlay?: boolean;
    overlayProps?: Record<string, unknown>;
    transition?: Record<string, unknown>;
  }): JSX.Element;
  export function Card(props: MTBaseProps & {
    color?: string;
    shadow?: boolean;
  }): JSX.Element;
}
