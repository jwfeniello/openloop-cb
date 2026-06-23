import logging
from django.shortcuts import render
from rest_framework import generics
from .models import Sample, Pack
from .serializers import SampleSerializer, PackSerializer
from logging import Logger
from taggit.managers import TaggableManager
from rest_framework import pagination, filters
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter

# Create your views here.
logger = Logger("default")


class SampleModelFilter(FilterSet):
    tags = CharFilter(field_name='tags__name', lookup_expr='iexact')

    class Meta:
        model = Sample
        fields = {
            'category': ['exact', 'icontains'],
            'name': ['icontains'],
            'pack': ['exact'],
            'pack__name': ['exact', 'icontains'],
            'pack__type': ['exact'],
        }
        exclude = ['tags']
        filter_overrides = {
            TaggableManager: {
                'filterset_class': CharFilter,
            },
        }


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class SampleLibraryList(generics.ListAPIView):
    categories = Sample.categories
    serializer_class = SampleSerializer
    pagination_class = StandardResultsSetPagination

    # filtering
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SampleModelFilter
    search_fields = ['name']
    ordering_fields = ['name', 'category', 'pack__type', 'duration', 'key', 'bpm']

    def get_queryset(self):
        return Sample.objects.all()


class PackList(generics.ListAPIView):
    serializer_class = PackSerializer
    pagination_class = None

    def get_queryset(self):
        return Pack.objects.all()
