/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
  PartialSegment,
  PipeSegment,
  ProjectSegment,
  isPartialSegment,
  isProjectSegment,
} from '../../../model/malloy_types';

import {ErrorFactory} from '../error-factory';
import {FieldSpace} from '../types/field-space';
import {GroupBy} from '../query-properties/group-by';
import {ProjectFieldSpace} from '../field-space/project-field-space';
import {QueryProperty} from '../types/query-property';
import {ReduceBuilder} from './reduce-builder';
import {QuerySpace} from '../field-space/query-spaces';
import {MalloyElement} from '../types/malloy-element';

export class ProjectBuilder extends ReduceBuilder {
  readonly type = 'project';
  getResultSpace(
    fs: FieldSpace,
    refineThis: PipeSegment | undefined,
    isNestIn: QuerySpace | undefined,
    astEl: MalloyElement
  ): ProjectFieldSpace {
    return new ProjectFieldSpace(fs, refineThis, isNestIn, astEl);
  }

  execute(qp: QueryProperty): void {
    if (qp.elementType === 'having' || qp instanceof GroupBy) {
      qp.log('Illegal statement in a select query operation');
    } else {
      super.execute(qp);
    }
  }

  finalize(fromSeg: PipeSegment | undefined): PipeSegment {
    let from: ProjectSegment | PartialSegment | undefined;
    if (fromSeg) {
      if (isProjectSegment(fromSeg) || isPartialSegment(fromSeg)) {
        from = fromSeg;
      } else {
        this.resultFS.log(`Can't refine select with ${fromSeg.type}`);
        return ErrorFactory.projectSegment;
      }
    }
    const projectSegment = this.resultFS.getQuerySegment(from);
    this.refineFrom(from, projectSegment);

    return projectSegment;
  }
}
